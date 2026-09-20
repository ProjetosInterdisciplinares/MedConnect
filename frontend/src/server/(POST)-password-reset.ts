"use server"

export default async function servicesPasswordReset(data: any) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    try {
        const response = await fetch(`${API_URL}/authentication/password-reset`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.status === 200) {
            return {
                status: 'success',
                message: result.detail || 'Senha redefinida com sucesso!',
                data: result
            };
        } else {
            return {
                status: 'error',
                message: result.error || 'Erro ao redefinir senha. Verifique seus dados.',
            };
        }
    } catch (error) {
        console.error("Erro na requisição:", error);
        return {
            status: 'error',
            message: 'Erro interno de rede',
        };
    }
}
