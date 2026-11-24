"""
Motor estatístico da análise de estoque.

Calcula, para cada material, consumo, cobertura, sobra prevista no
vencimento (simulação FEFO: primeiro vence, primeiro sai) e o excedente
acima do horizonte de planejamento. O resultado é determinístico e serve
de base para a IA, que só julga e prioriza em cima desses números — e de
plano B quando a IA está indisponível.
"""
import math
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import date

from estoque_ia import tipos
from estoque_ia.leitor import Alerta, LeituraEstoque, SaldoLote
from estoque_ia.tipos import normalizar

HORIZONTE_PADRAO_DIAS = 180
HORIZONTES_PERMITIDOS = (90, 180, 365)
FATOR_SEGURANCA = 1.2           # consumo projetado com 20% de margem
DIAS_ESTOQUE_BAIXO = 15         # cobertura abaixo disso = risco de falta
EVENTOS_GIRO_RARO = 3           # até 3 saídas de consumo no período = uso pontual
DIAS_VALIDADE_PROXIMA = 90
DIAS_PERIODO_CRITICO = 14
DIAS_PERIODO_RECOMENDADO = 60
DIAS_DADOS_DESATUALIZADOS = 30
ITENS_POR_ALERTA = 6

PERFIS = {
    'sem_giro': ('Sem giro', 85),
    'risco_vencimento': ('Risco de vencimento', 80),
    'giro_raro': ('Uso pontual', 65),
    'excesso': ('Excesso de estoque', 50),
    'saudavel': ('Giro saudável', 10),
    'estoque_baixo': ('Estoque baixo', 5),
    'sem_saldo': ('Sem saldo', 0),
}
PERFIS_CANDIDATOS = ('sem_giro', 'risco_vencimento', 'giro_raro', 'excesso')
ORDEM_PRIORIDADE = {'alta': 0, 'media': 1, 'baixa': 2, 'nenhuma': 3}


def arredondar(valor: float | None, casas: int = 2):
    if valor is None:
        return None
    valor = round(float(valor), casas)
    return int(valor) if float(valor).is_integer() else valor


def fmt_qtd(valor: float) -> str:
    v = arredondar(valor, 1)
    return f'{v:,}'.replace(',', 'X').replace('.', ',').replace('X', '.')


def fmt_data(d: date | None) -> str:
    return d.strftime('%d/%m/%Y') if d else ''


@dataclass
class _Material:
    chave: str
    codigo: str = ''
    descricao: str = ''
    unidade: str = ''
    entradas: float = 0
    compras: float = 0
    devolucoes: float = 0
    consumo_bruto: float = 0
    saida_transferencia: float = 0
    perda_vencimento: float = 0
    perda_outra: float = 0
    ajuste_saida: float = 0
    transferencias_internas: int = 0
    eventos_consumo: int = 0
    maior_evento: float = 0
    dias_consumo: set = field(default_factory=set)
    semanas_consumo: set = field(default_factory=set)
    ultimo_consumo: date | None = None
    ultima_entrada: date | None = None
    lotes_entrada: list = field(default_factory=list)  # (data, qtd, lote, validade)
    lotes_saldo: list = field(default_factory=list)    # SaldoLote
    tem_movimentacao: bool = False


@dataclass
class ResultadoAnalise:
    periodo_inicio: date
    periodo_fim: date
    dias_periodo: int
    horizonte_dias: int
    indicadores: dict
    alertas: list[dict]
    itens: list[dict]


class MotorAnaliseEstoque:

    def __init__(self, horizonte_dias: int = HORIZONTE_PADRAO_DIAS, hoje: date | None = None):
        self.horizonte = horizonte_dias if horizonte_dias in HORIZONTES_PERMITIDOS else HORIZONTE_PADRAO_DIAS
        self.hoje = hoje or date.today()

    def analisar(self, leitura: LeituraEstoque) -> ResultadoAnalise:
        alertas: list[Alerta] = list(leitura.alertas)
        movs = leitura.movimentacoes
        inicio = min(m.data for m in movs)
        fim = max(m.data for m in movs)
        dias = (fim - inicio).days + 1
        semanas = max(1, math.ceil(dias / 7))

        materiais, contagem = self._agrupar(leitura)
        sem_movimento = sum(1 for m in materiais.values() if not m.tem_movimentacao)

        itens = [self._avaliar(m, dias, semanas, fim, leitura.tem_aba_saldo) for m in materiais.values()]
        itens.sort(key=chave_ordenacao)

        alertas += self._alertas_periodo(dias, inicio, fim)
        alertas += self._alertas_itens(itens, leitura, contagem, sem_movimento)

        indicadores = calcular_indicadores(itens)
        indicadores.update({
            'total_movimentacoes': len(movs),
            'linhas_lidas': leitura.linhas_lidas,
            'transferencias_internas': contagem.get(tipos.TRANSFERENCIA_INTERNA, 0),
            'saldo_informado': leitura.tem_aba_saldo,
            'movimentacoes_por_tipo': {tipos.ROTULOS[c]: n for c, n in contagem.most_common()},
        })
        return ResultadoAnalise(inicio, fim, dias, self.horizonte, indicadores,
                                [a.como_dict() for a in ordenar_alertas(alertas)], itens)

    # ── Agrupamento ───────────────────────────────────────────────────

    def _agrupar(self, leitura: LeituraEstoque):
        materiais: dict[str, _Material] = {}
        por_descricao: dict[str, str] = {}
        contagem: Counter = Counter()

        for m in leitura.movimentacoes:
            contagem[m.categoria] += 1
            chave = m.codigo or normalizar(m.descricao)
            mat = materiais.get(chave)
            if mat is None:
                mat = materiais[chave] = _Material(chave=chave, codigo=m.codigo)
            mat.descricao = m.descricao  # a descrição mais recente prevalece
            mat.unidade = m.unidade or mat.unidade
            mat.tem_movimentacao = True
            por_descricao.setdefault(normalizar(m.descricao), chave)
            if m.categoria == tipos.TRANSFERENCIA_INTERNA:
                mat.transferencias_internas += 1  # não altera o estoque total da instituição
                continue
            self._somar(mat, m)

        for lote in leitura.saldos:
            chave = (lote.codigo if lote.codigo in materiais else None) \
                or por_descricao.get(normalizar(lote.descricao)) \
                or lote.codigo or normalizar(lote.descricao)
            mat = materiais.get(chave)
            if mat is None:
                mat = materiais[chave] = _Material(chave=chave, codigo=lote.codigo, descricao=lote.descricao)
            mat.unidade = mat.unidade or lote.unidade
            mat.lotes_saldo.append(lote)
        return materiais, contagem

    @staticmethod
    def _somar(mat: _Material, m) -> None:
        q, c = m.quantidade, m.categoria
        if c in (tipos.SAIDA_CONSUMO, tipos.SAIDA_OUTRA):
            mat.consumo_bruto += q
            mat.eventos_consumo += 1
            mat.maior_evento = max(mat.maior_evento, q)
            mat.dias_consumo.add(m.data)
            mat.semanas_consumo.add(m.data.isocalendar()[:2])
            mat.ultimo_consumo = max(mat.ultimo_consumo or m.data, m.data)
        elif c == tipos.ENTRADA_DEVOLUCAO:
            mat.devolucoes += q
        elif c in tipos.ENTRADAS:
            mat.entradas += q
            if c == tipos.ENTRADA_COMPRA:
                mat.compras += q
            if c != tipos.ENTRADA_AJUSTE:
                mat.ultima_entrada = max(mat.ultima_entrada or m.data, m.data)
                mat.lotes_entrada.append((m.data, q, m.lote, m.validade))
        elif c == tipos.SAIDA_TRANSFERENCIA:
            mat.saida_transferencia += q
        elif c == tipos.SAIDA_PERDA_VENCIMENTO:
            mat.perda_vencimento += q
        elif c == tipos.SAIDA_PERDA_OUTRA:
            mat.perda_outra += q
        elif c == tipos.SAIDA_AJUSTE:
            mat.ajuste_saida += q

    # ── Avaliação de um material ──────────────────────────────────────

    def _avaliar(self, mat: _Material, dias: int, semanas: int, fim: date, saldo_informado: bool) -> dict:
        consumo = max(0.0, mat.consumo_bruto - mat.devolucoes)
        diario = consumo / dias

        if mat.lotes_saldo or saldo_informado:
            # Com a aba de saldo, o item que não aparece nela está zerado
            saldo = sum(l.saldo for l in mat.lotes_saldo)
            saldo_estimado = False
            lotes = [(l.saldo, l.validade, l.lote) for l in mat.lotes_saldo]
        else:
            saldo = (mat.entradas + mat.devolucoes) - (mat.consumo_bruto + mat.saida_transferencia
                                                         + mat.perda_vencimento + mat.perda_outra + mat.ajuste_saida)
            saldo_estimado = True
            lotes = self._lotes_por_entrada(mat, max(saldo, 0))
        saldo_negativo = saldo < 0
        saldo = max(saldo, 0.0)

        # Simulação FEFO: o consumo vai para o lote que vence primeiro
        projetado = diario * FATOR_SEGURANCA
        consumido = 0.0
        vencido = sobra_validade = sem_validade = 0.0
        validade_proxima = lote_risco = validade_risco = None
        for qtd, validade, lote in sorted(lotes, key=lambda l: l[1] or date.max):
            if validade is None:
                sem_validade += qtd
                continue
            dias_ate = (validade - self.hoje).days
            if dias_ate < 0:
                vencido += qtd
                continue
            validade_proxima = validade_proxima or validade
            usado = min(qtd, max(0.0, projetado * dias_ate - consumido))
            consumido += usado
            if qtd - usado > 0.0001:
                sobra_validade += qtd - usado
                if validade_risco is None:
                    lote_risco, validade_risco = lote, validade

        valido = max(saldo - vencido, 0.0)
        # Uso pontual: mantém ao menos duas vezes a maior saída já registrada
        reserva_minima = 2 * mat.maior_evento if consumo else 0.0
        reserva = max(projetado * self.horizonte, reserva_minima)
        excedente_horizonte = max(0.0, valido - reserva)
        sugerida = math.floor(max(0.0, min(valido - reserva_minima, max(sobra_validade, excedente_horizonte))) + 1e-9)
        cobertura = valido / diario if diario > 0 else None
        dias_sem_consumo = (fim - mat.ultimo_consumo).days if mat.ultimo_consumo else dias

        perfil = self._perfil(mat, consumo, valido, cobertura, sobra_validade, saldo_estimado)
        sinais = [nome for nome, ativo in (
            ('sem_giro', consumo <= 0 and valido > 0),
            ('uso_pontual', 0 < mat.eventos_consumo <= EVENTOS_GIRO_RARO),
            ('sobra_no_vencimento', sobra_validade > 0),
            ('perda_por_vencimento', mat.perda_vencimento > 0),
            ('excesso', cobertura is not None and cobertura > self.horizonte),
            ('lote_vencido', vencido > 0),
            ('estoque_baixo', perfil == 'estoque_baixo'),
            ('saldo_estimado', saldo_estimado),
            ('circula_sem_consumo', consumo <= 0 and mat.transferencias_internas > 0),
        ) if ativo]
        anunciar = sugerida > 0 and perfil in PERFIS_CANDIDATOS
        score = PERFIS[perfil][1]
        if valido > 0:
            score += 15 * min(1.0, sugerida / valido)
        if anunciar and validade_risco and (validade_risco - self.hoje).days <= DIAS_VALIDADE_PROXIMA:
            score += 5
        if 'circula_sem_consumo' in sinais:
            # Circula entre estoques sem consumo registrado: o uso pode estar lançado com outro tipo
            score -= 40
        score = min(100, round(score))
        prioridade = ('alta' if score >= 75 else 'media' if score >= 50 else 'baixa') if anunciar else 'nenhuma'

        valores = [(l.valor_unitario, l.saldo) for l in mat.lotes_saldo if l.valor_unitario]
        peso = sum(q for _, q in valores)
        valor_unitario = (sum(v * q for v, q in valores) / peso) if peso else (valores[0][0] if valores else None)

        item = {
            'chave': mat.chave,
            'codigo': mat.codigo,
            'descricao': mat.descricao,
            'unidade': mat.unidade,
            'perfil': perfil,
            'perfil_rotulo': PERFIS[perfil][0],
            'sinais': sinais,
            'prioridade': prioridade,
            'score': score,
            'anunciar': anunciar,
            'qtd_sugerida': sugerida if anunciar else 0,
            'qtd_sugerida_regra': sugerida if anunciar else 0,
            'qtd_maxima': math.floor(valido),
            'saldo': arredondar(saldo),
            'saldo_estimado': saldo_estimado,
            'saldo_negativo': saldo_negativo,
            'entradas': arredondar(mat.entradas),
            'compras': arredondar(mat.compras),
            'consumo': arredondar(consumo),
            'consumo_mensal': arredondar(diario * 30, 1),
            'eventos_consumo': mat.eventos_consumo,
            'dias_com_consumo': len(mat.dias_consumo),
            'frequencia_semanal': arredondar(len(mat.semanas_consumo) / semanas, 2),
            'perda_vencimento': arredondar(mat.perda_vencimento),
            'perda_outra': arredondar(mat.perda_outra),
            'cobertura_dias': None if cobertura is None else int(round(cobertura)),
            'dias_sem_consumo': dias_sem_consumo,
            'ultimo_consumo': mat.ultimo_consumo.isoformat() if mat.ultimo_consumo else None,
            'ultima_entrada': mat.ultima_entrada.isoformat() if mat.ultima_entrada else None,
            'validade_proxima': validade_proxima.isoformat() if validade_proxima else None,
            'qtd_risco_vencimento': arredondar(sobra_validade),
            'qtd_vencida': arredondar(vencido),
            'qtd_sem_validade': arredondar(sem_validade),
            'lote_sugerido': lote_risco or '',
            'validade_sugerida': validade_risco.isoformat() if validade_risco else None,
            'valor_unitario': arredondar(valor_unitario),
            'valor_excedente': arredondar(sugerida * valor_unitario) if (valor_unitario and anunciar) else None,
            'tem_movimentacao': mat.tem_movimentacao,
            'transferencias_internas': mat.transferencias_internas,
            'justificativa': '',
            'fonte_justificativa': 'regra',
            'anterior': None,
        }
        item['justificativa'] = self.justificar(item, dias)
        return item

    @staticmethod
    def _lotes_por_entrada(mat: _Material, saldo: float) -> list:
        """Sem aba de saldo: o que sobrou são as entradas mais recentes (consumo em ordem de chegada)."""
        if not any(v for *_, v in mat.lotes_entrada):
            return [(saldo, None, '')] if saldo > 0 else []
        lotes, restante = [], saldo
        for _, qtd, lote, validade in sorted(mat.lotes_entrada, key=lambda l: l[0], reverse=True):
            if restante <= 0:
                break
            parte = min(qtd, restante)
            lotes.append((parte, validade, lote))
            restante -= parte
        if restante > 0:
            lotes.append((restante, None, ''))
        return lotes

    def _perfil(self, mat, consumo, valido, cobertura, sobra_validade, saldo_estimado) -> str:
        if valido <= 0:
            return 'estoque_baixo' if (consumo > 0 and not saldo_estimado) else 'sem_saldo'
        if consumo <= 0:
            return 'sem_giro'
        if mat.perda_vencimento > 0 or sobra_validade > 0:
            return 'risco_vencimento'
        if mat.eventos_consumo <= EVENTOS_GIRO_RARO:
            return 'giro_raro'
        if cobertura is not None and cobertura > self.horizonte:
            return 'excesso'
        if cobertura is not None and cobertura < DIAS_ESTOQUE_BAIXO:
            return 'estoque_baixo'
        return 'saudavel'

    def justificar(self, item: dict, dias: int) -> str:
        un = item['unidade'].lower() or 'un.'
        saldo = fmt_qtd(item['saldo'])
        perfil = item['perfil']
        if perfil == 'sem_giro':
            if 'circula_sem_consumo' in item['sinais']:
                return (f'Nenhum consumo registrado em {dias} dias, mas o item teve {item["transferencias_internas"]} '
                        'transferência(s) entre estoques. Confirme se o uso é lançado com outro tipo antes de anunciar.')
            return f'Nenhum consumo em {dias} dias, com {saldo} {un} em estoque. Tudo o que está parado pode ser repassado.'
        if perfil == 'risco_vencimento':
            if item['qtd_risco_vencimento']:
                return (f'No ritmo atual ({fmt_qtd(item["consumo_mensal"])} {un}/mês), cerca de '
                        f'{fmt_qtd(item["qtd_risco_vencimento"])} {un} devem vencer antes do uso'
                        f'{" (validade " + fmt_data(date.fromisoformat(item["validade_sugerida"])) + ")" if item["validade_sugerida"] else ""}.')
            return (f'Já houve perda de {fmt_qtd(item["perda_vencimento"])} {un} por vencimento no período, '
                    f'e o estoque cobre {item["cobertura_dias"]} dias de consumo.')
        if perfil == 'giro_raro':
            return (f'Uso pontual: {item["eventos_consumo"]} saída(s) para consumo em {dias} dias. '
                    f'O saldo de {saldo} {un} cobre cerca de {item["cobertura_dias"]} dias.')
        if perfil == 'excesso':
            return (f'O estoque cobre cerca de {item["cobertura_dias"]} dias de consumo, acima do horizonte de '
                    f'{self.horizonte} dias. O excedente pode ser repassado sem risco de falta.')
        if perfil == 'estoque_baixo':
            if item['cobertura_dias'] is not None:
                return f'Estoque para cerca de {item["cobertura_dias"]} dias de consumo. Não anuncie; avalie a reposição.'
            return 'Item consumido no período e sem saldo em estoque. Avalie a reposição.'
        if perfil == 'sem_saldo':
            return 'Sem saldo calculado no período: as saídas superaram as entradas registradas na planilha.'
        return f'Giro compatível com o estoque (cobertura de cerca de {item["cobertura_dias"]} dias).'

    # ── Alertas ───────────────────────────────────────────────────────

    def _alertas_periodo(self, dias: int, inicio: date, fim: date) -> list[Alerta]:
        alertas = []
        periodo = f'de {fmt_data(inicio)} a {fmt_data(fim)}'
        if dias < DIAS_PERIODO_CRITICO:
            alertas.append(Alerta(
                'critico', 'Período de estoque muito curto',
                f'A planilha cobre só {dias} dia(s) ({periodo}). Com tão pouco histórico, itens de uso mensal parecem '
                f'"sem giro". Use as sugestões com cautela e envie pelo menos {DIAS_PERIODO_RECOMENDADO} dias '
                '(o ideal são 3 a 6 meses).',
            ))
        elif dias < DIAS_PERIODO_RECOMENDADO:
            alertas.append(Alerta(
                'aviso', 'Período de estoque curto',
                f'A planilha cobre {dias} dias ({periodo}). Para uma análise confiável de itens de uso pontual, '
                'recomendamos de 3 a 6 meses de movimentação.',
            ))
        atraso = (self.hoje - fim).days
        if atraso > DIAS_DADOS_DESATUALIZADOS:
            alertas.append(Alerta(
                'aviso', 'Dados desatualizados',
                f'A última movimentação é de {fmt_data(fim)}, há {atraso} dias. O estoque pode ter mudado desde então: '
                'confira o saldo antes de anunciar.',
            ))
        return alertas

    def _alertas_itens(self, itens, leitura: LeituraEstoque, contagem: Counter, sem_movimento: int) -> list[Alerta]:
        alertas = []
        vencidos = [i for i in itens if i['qtd_vencida']]
        if vencidos:
            alertas.append(Alerta(
                'critico', 'Lotes vencidos em estoque',
                f'{len(vencidos)} item(ns) têm lotes já vencidos. Eles não podem ser anunciados: separe-os e faça o '
                'descarte conforme o plano de gerenciamento de resíduos (PGRSS).',
                [f'{i["descricao"]}: {fmt_qtd(i["qtd_vencida"])} {i["unidade"].lower() or "un."}'
                 for i in vencidos[:ITENS_POR_ALERTA]],
            ))
        baixos = sorted((i for i in itens if i['perfil'] == 'estoque_baixo'),
                        key=lambda i: i['cobertura_dias'] if i['cobertura_dias'] is not None else -1)
        if baixos:
            alertas.append(Alerta(
                'aviso', 'Itens com estoque baixo',
                f'{len(baixos)} item(ns) têm estoque para menos de {DIAS_ESTOQUE_BAIXO} dias de consumo. '
                'Não anuncie esses itens e avalie a reposição.',
                [f'{i["descricao"]}: ' + (f'{i["cobertura_dias"]} dia(s)' if i['cobertura_dias'] else 'sem saldo válido')
                 for i in baixos[:ITENS_POR_ALERTA]],
            ))
        ausentes = [i for i in itens if leitura.tem_aba_saldo and i['tem_movimentacao'] and not i['saldo']
                    and not i['qtd_vencida']]
        if ausentes:
            alertas.append(Alerta(
                'info', 'Itens fora da aba de saldo',
                f'{len(ausentes)} item(ns) com movimentação não aparecem na aba "Saldo Atual" (ou estão com saldo zero) '
                'e foram considerados sem estoque.',
                [i['descricao'] for i in ausentes[:ITENS_POR_ALERTA]],
            ))
        circulam = [i for i in itens if 'circula_sem_consumo' in i['sinais'] and i['saldo']]
        if circulam:
            alertas.append(Alerta(
                'aviso', 'Itens que circulam sem consumo registrado',
                f'{len(circulam)} item(ns) são transferidos entre estoques internos, mas não têm nenhuma saída de consumo. '
                'Confira se o consumo deles é lançado com outro tipo de movimentação antes de anunciar: '
                'por isso ficaram com prioridade menor.',
                [i['descricao'] for i in circulam[:ITENS_POR_ALERTA]],
            ))
        if not leitura.tem_aba_saldo:
            negativos = sum(1 for i in itens if i['saldo_negativo'])
            mensagem = ('Sem a aba "Saldo Atual", o saldo foi estimado por entradas menos saídas do período. '
                        'Para mais precisão, inclua o saldo de hoje com lote e validade.')
            if negativos:
                mensagem += (f' Em {negativos} item(ns) as saídas superaram as entradas (estoque inicial fora da '
                             'planilha), e o saldo foi considerado zero.')
            alertas.append(Alerta('info', 'Saldo estimado', mensagem))
        if not any(i['validade_proxima'] or i['qtd_vencida'] for i in itens):
            alertas.append(Alerta(
                'info', 'Sem datas de validade',
                f'Sem validade dos lotes, a sobra foi estimada pelo consumo dos próximos {self.horizonte} dias. '
                'Informe a validade para identificar o que vai vencer sem uso.',
            ))
        if contagem.get(tipos.TRANSFERENCIA_INTERNA):
            alertas.append(Alerta(
                'info', 'Transferências internas ignoradas',
                f'{contagem[tipos.TRANSFERENCIA_INTERNA]} transferência(s) entre estoques da própria instituição '
                'não contam como consumo nem como compra.',
            ))
        if contagem.get(tipos.SAIDA_OUTRA):
            alertas.append(Alerta(
                'info', 'Saídas sem tipo específico',
                f'{contagem[tipos.SAIDA_OUTRA]} saída(s) sem tipo específico foram tratadas como consumo.',
            ))
        if sem_movimento:
            alertas.append(Alerta(
                'info', 'Itens sem movimentação',
                f'{sem_movimento} item(ns) do saldo não tiveram nenhuma movimentação no período e foram tratados como sem giro.',
            ))
        if not any(i['anunciar'] for i in itens):
            alertas.append(Alerta(
                'info', 'Nenhuma sobra prevista',
                'Pelo padrão de consumo, nenhum item deve sobrar no horizonte analisado.',
            ))
        return alertas


# ── Funções compartilhadas com a IA e com o histórico ────────────────

def chave_ordenacao(item: dict):
    return (not item['anunciar'], ORDEM_PRIORIDADE.get(item['prioridade'], 3), -item['score'], item['descricao'])


def ordenar_alertas(alertas: list[Alerta]) -> list[Alerta]:
    ordem = {'critico': 0, 'aviso': 1, 'info': 2}
    return sorted(alertas, key=lambda a: ordem.get(a.nivel, 3))


def calcular_indicadores(itens: list[dict]) -> dict:
    perfis = Counter(i['perfil'] for i in itens)
    sugeridos = [i for i in itens if i['anunciar']]
    valores = [i['valor_excedente'] for i in sugeridos if i['valor_excedente']]
    return {
        'total_materiais': len(itens),
        'total_sugeridos': len(sugeridos),
        'prioridade_alta': sum(1 for i in sugeridos if i['prioridade'] == 'alta'),
        'valor_total_sugerido': arredondar(sum(valores)) if valores else None,
        'itens_com_vencido': sum(1 for i in itens if i['qtd_vencida']),
        'itens_com_perda_vencimento': sum(1 for i in itens if i['perda_vencimento']),
        'perfis': {chave: perfis.get(chave, 0) for chave in PERFIS},
    }


def comparar_com_anterior(itens: list[dict], anteriores: list[dict], data_anterior: str) -> int:
    """Anota em cada item como ele estava na análise anterior. Devolve quantos seguem com sobra."""
    por_chave = {i['chave']: i for i in anteriores}
    recorrentes = 0
    for item in itens:
        antes = por_chave.get(item['chave'])
        if not antes:
            continue
        item['anterior'] = {
            'data': data_anterior,
            'saldo': antes.get('saldo'),
            'perfil': antes.get('perfil'),
            'perfil_rotulo': antes.get('perfil_rotulo'),
            'anunciar': antes.get('anunciar'),
            'qtd_sugerida': antes.get('qtd_sugerida'),
        }
        if item['anunciar'] and antes.get('anunciar'):
            recorrentes += 1
    return recorrentes


__all__ = [
    'MotorAnaliseEstoque', 'ResultadoAnalise', 'SaldoLote', 'calcular_indicadores', 'chave_ordenacao',
    'comparar_com_anterior', 'HORIZONTE_PADRAO_DIAS', 'HORIZONTES_PERMITIDOS', 'PERFIS',
]
