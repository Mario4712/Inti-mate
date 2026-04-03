const translations: Record<string, Record<string, string>> = {
  "pt-BR": {
    // Nav
    "nav.overview": "Visao Geral",
    "nav.content": "Conteudo",
    "nav.subscribers": "Assinantes",
    "nav.revenue": "Receita",
    "nav.analytics": "Analytics",
    "nav.lives": "Lives",
    "nav.settings": "Configuracoes",

    // Dashboard
    "dashboard.greeting": "Ola",
    "dashboard.welcome": "Bem-vindo ao seu painel de controle",
    "dashboard.activeSubscribers": "Assinantes Ativos",
    "dashboard.revenue30d": "Receita (30d)",
    "dashboard.contents": "Conteudos",
    "dashboard.views30d": "Views (30d)",
    "dashboard.recentActivity": "Atividade Recente",
    "dashboard.quickActions": "Acoes Rapidas",
    "dashboard.noActivity": "Nenhuma atividade recente",

    // Auth
    "auth.login": "Entrar",
    "auth.register": "Criar conta",
    "auth.logout": "Sair",
    "auth.email": "E-mail",
    "auth.password": "Senha",
    "auth.forgotPassword": "Esqueci minha senha",
    "auth.newPassword": "Nova senha",
    "auth.confirmPassword": "Confirmar senha",

    // Content
    "content.upload": "Upload de Conteudo",
    "content.dragDrop": "Arraste arquivos aqui ou clique para selecionar",
    "content.visibility": "Visibilidade",
    "content.subscribers": "Assinantes",
    "content.public": "Publico",
    "content.ppv": "Pay-per-view",

    // Common
    "common.loading": "Carregando...",
    "common.save": "Salvar",
    "common.cancel": "Cancelar",
    "common.delete": "Excluir",
    "common.edit": "Editar",
    "common.back": "Voltar",
    "common.next": "Proximo",
    "common.previous": "Anterior",
    "common.search": "Buscar",
    "common.page": "Pagina",
    "common.of": "de",
  },
  en: {
    // Nav
    "nav.overview": "Overview",
    "nav.content": "Content",
    "nav.subscribers": "Subscribers",
    "nav.revenue": "Revenue",
    "nav.analytics": "Analytics",
    "nav.lives": "Lives",
    "nav.settings": "Settings",

    // Dashboard
    "dashboard.greeting": "Hello",
    "dashboard.welcome": "Welcome to your dashboard",
    "dashboard.activeSubscribers": "Active Subscribers",
    "dashboard.revenue30d": "Revenue (30d)",
    "dashboard.contents": "Content",
    "dashboard.views30d": "Views (30d)",
    "dashboard.recentActivity": "Recent Activity",
    "dashboard.quickActions": "Quick Actions",
    "dashboard.noActivity": "No recent activity",

    // Auth
    "auth.login": "Sign in",
    "auth.register": "Sign up",
    "auth.logout": "Sign out",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.forgotPassword": "Forgot password",
    "auth.newPassword": "New password",
    "auth.confirmPassword": "Confirm password",

    // Content
    "content.upload": "Upload Content",
    "content.dragDrop": "Drag files here or click to select",
    "content.visibility": "Visibility",
    "content.subscribers": "Subscribers",
    "content.public": "Public",
    "content.ppv": "Pay-per-view",

    // Common
    "common.loading": "Loading...",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.back": "Back",
    "common.next": "Next",
    "common.previous": "Previous",
    "common.search": "Search",
    "common.page": "Page",
    "common.of": "of",
  },
  es: {
    "nav.overview": "Vista General",
    "nav.content": "Contenido",
    "nav.subscribers": "Suscriptores",
    "nav.revenue": "Ingresos",
    "nav.analytics": "Analiticas",
    "nav.lives": "En Vivo",
    "nav.settings": "Configuracion",
    "dashboard.greeting": "Hola",
    "dashboard.welcome": "Bienvenido a tu panel de control",
    "dashboard.activeSubscribers": "Suscriptores Activos",
    "dashboard.revenue30d": "Ingresos (30d)",
    "dashboard.contents": "Contenidos",
    "dashboard.views30d": "Vistas (30d)",
    "auth.login": "Iniciar sesion",
    "auth.register": "Registrarse",
    "auth.logout": "Cerrar sesion",
    "common.loading": "Cargando...",
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
  },
};

export type Locale = "pt-BR" | "en" | "es";

const DEFAULT_LOCALE: Locale = "pt-BR";

let currentLocale: Locale = DEFAULT_LOCALE;

export function setLocale(locale: Locale) {
  currentLocale = locale;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("locale", locale);
  }
}

export function getLocale(): Locale {
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem("locale") as Locale | null;
    if (stored && translations[stored]) {
      currentLocale = stored;
    }
  }
  return currentLocale;
}

export function t(key: string, params?: Record<string, string | number>): string {
  const locale = getLocale();
  let value = translations[locale]?.[key] ?? translations[DEFAULT_LOCALE]?.[key] ?? key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(`{${k}}`, String(v));
    }
  }

  return value;
}

export const locales: { code: Locale; label: string }[] = [
  { code: "pt-BR", label: "Portugues (BR)" },
  { code: "en", label: "English" },
  { code: "es", label: "Espanol" },
];
