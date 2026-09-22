"use client"

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthManager } from "./AuthManager";

/**
 * Padrão Decorator (HOC - Higher Order Component)
 * Envolve (decora) um componente React adicionando a regra de autenticação.
 */
export function withAuth<P extends object>(WrappedComponent: React.ComponentType<P>) {
  // Retorna um novo componente decorado
  return function AuthenticatedComponent(props: P) {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
      // Usa o Singleton que criamos anteriormente
      const auth = AuthManager.getInstance();
      const userId = auth.getUserId();
      const token = auth.getToken();

      if (!userId || !token) {
        // Se não estiver logado, redireciona e barra a renderização
        router.replace("/auth");
      } else {
        // Se estiver logado, autoriza a renderização
        setIsAuthorized(true);
      }
    }, [router]);

    // Enquanto verifica, não renderiza a página privada (evita piscar o conteúdo)
    if (!isAuthorized) {
      return null; 
    }

    // Se estiver autorizado, renderiza o componente original passando as propriedades
    return <WrappedComponent {...props} />;
  };
}
