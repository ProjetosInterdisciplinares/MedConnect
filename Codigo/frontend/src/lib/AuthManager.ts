export class AuthManager {
  // 1. Instância privada estática (armazena a única instância da classe)
  private static instance: AuthManager;
  
  // Variáveis de estado do Singleton
  private userId: number | null = null;
  private token: string | null = null;

  // 2. Construtor privado (impede que seja instanciada usando 'new AuthManager()')
  private constructor() {
    // Inicialização segura garantindo que só rode no client-side
    if (typeof window !== "undefined") {
      const storedId = localStorage.getItem("userId");
      const storedToken = localStorage.getItem("token");
      this.userId = storedId ? Number(storedId) : null;
      this.token = storedToken;
    }
  }

  // 3. Método estático de acesso global (o "Factory Method" do Singleton)
  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  // Métodos de negócio do Singleton
  public setAuth(userId: number, token: string): void {
    this.userId = userId;
    this.token = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("userId", String(userId));
      localStorage.setItem("token", token);
    }
  }

  public getUserId(): number | null {
    return this.userId;
  }

  public getToken(): string | null {
    return this.token;
  }

  public logout(): void {
    this.userId = null;
    this.token = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("userId");
      localStorage.removeItem("token");
    }
  }
}
