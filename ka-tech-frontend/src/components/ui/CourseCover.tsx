import React, { useState } from "react";
import {
  BarChart3, BookOpen, Boxes, Calculator, Cloud, CreditCard, FileText, GraduationCap, Headphones,
  Percent, Pill, Plug, Printer, Receipt, Rocket, Settings, ShieldCheck, Shirt, ShoppingCart,
  Smartphone, Store, Tag, Truck, Tv, Users, UtensilsCrossed, Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/*
  Capa de curso gerada pelo próprio site (sem arquivo de imagem).
  Segue a marca KA Academy (amarelo, laranja e contorno preto).
  Ícone e cor do quadro: a escolha feita no admin (cover_icon/cover_color);
  sem ela, o assunto do título; depois a escolha da trilha; depois o nome da
  trilha. Assim o mesmo curso fica igual no dashboard, na trilha e no admin.
*/

/** Ícones que o admin pode escolher. A chave é o que fica gravado no banco. */
export const COVER_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  cart: { icon: ShoppingCart, label: "Vendas / PDV" },
  "file-text": { icon: FileText, label: "Notas fiscais" },
  utensils: { icon: UtensilsCrossed, label: "Restaurante" },
  pill: { icon: Pill, label: "Farmácia" },
  shirt: { icon: Shirt, label: "Vestuário" },
  wallet: { icon: Wallet, label: "Financeiro" },
  chart: { icon: BarChart3, label: "Relatórios" },
  boxes: { icon: Boxes, label: "Estoque" },
  truck: { icon: Truck, label: "Compras" },
  users: { icon: Users, label: "Clientes" },
  card: { icon: CreditCard, label: "Cartão" },
  printer: { icon: Printer, label: "Impressão" },
  plug: { icon: Plug, label: "Integrações" },
  settings: { icon: Settings, label: "Configuração" },
  tv: { icon: Tv, label: "Lives" },
  store: { icon: Store, label: "Loja" },
  receipt: { icon: Receipt, label: "Trocas / recibos" },
  tag: { icon: Tag, label: "Preços / etiquetas" },
  percent: { icon: Percent, label: "Promoções" },
  calculator: { icon: Calculator, label: "Cálculos" },
  phone: { icon: Smartphone, label: "Celular / app" },
  cloud: { icon: Cloud, label: "Nuvem" },
  shield: { icon: ShieldCheck, label: "Segurança" },
  headphones: { icon: Headphones, label: "Suporte" },
  book: { icon: BookOpen, label: "Conteúdo" },
  rocket: { icon: Rocket, label: "Primeiros passos" },
  cap: { icon: GraduationCap, label: "Geral" },
};

/** Cores do quadro do ícone. A chave é o que fica gravado no banco. */
export const COVER_COLORS: Record<string, { hex: string; label: string }> = {
  violet: { hex: "#c4b5fd", label: "Lilás" },
  indigo: { hex: "#a5b4fc", label: "Anil" },
  blue: { hex: "#93c5fd", label: "Azul" },
  cyan: { hex: "#67e8f9", label: "Ciano" },
  teal: { hex: "#5eead4", label: "Turquesa" },
  emerald: { hex: "#6ee7b7", label: "Esmeralda" },
  green: { hex: "#86efac", label: "Verde" },
  amber: { hex: "#f2b705", label: "Mostarda" },
  orange: { hex: "#fb923c", label: "Laranja" },
  rose: { hex: "#fda4af", label: "Rosa" },
  pink: { hex: "#f9a8d4", label: "Pink" },
  slate: { hex: "#ffffff", label: "Branco" },
};

export interface CoverChoice {
  cover_icon?: string | null;
  cover_color?: string | null;
}

interface Topic {
  match: RegExp;
  icon: string;
  hue: string;
}

// A ordem importa: o primeiro assunto que casar vence.
const TOPICS: Topic[] = [
  { match: /restaurante|food|delivery|comanda|mesa|lanchonete|bar\b|card[aá]pio|cozinha/, icon: "utensils", hue: "amber" },
  { match: /farm[aá]cia|drogaria|medicamento|rem[eé]dio/, icon: "pill", hue: "emerald" },
  { match: /vestu[aá]rio|moda|roupa|confec|cal[cç]ado|grade/, icon: "shirt", hue: "teal" },
  { match: /nota|nf-?e|nfc-?e|fiscal|tribut|sped|imposto|xml|cfop|ncm/, icon: "file-text", hue: "blue" },
  { match: /financeir|contas? a|boleto|pix|banco|concilia|fluxo de caixa|cobran/, icon: "wallet", hue: "green" },
  { match: /relat[oó]rio|indicador|dashboard|gr[aá]fico|bi\b|an[aá]lise/, icon: "chart", hue: "indigo" },
  { match: /estoque|invent[aá]rio|produto|cadastro de item|mercadoria/, icon: "boxes", hue: "orange" },
  { match: /compra|fornecedor|pedido de compra|entrada/, icon: "truck", hue: "cyan" },
  { match: /cliente|crm|fideli|credi[aá]rio/, icon: "users", hue: "pink" },
  { match: /cart[aã]o|tef|pagamento|maquininha/, icon: "card", hue: "violet" },
  { match: /etiqueta|impressora|impress[aã]o|balan[cç]a|perif/, icon: "printer", hue: "slate" },
  { match: /integra|e-?commerce|marketplace|api\b|loja virtual/, icon: "plug", hue: "cyan" },
  { match: /configura|instala|certificado|par[aâ]metro|usu[aá]rio|permiss/, icon: "settings", hue: "slate" },
  { match: /live|ao vivo|webinar/, icon: "tv", hue: "rose" },
  { match: /pdv|frente de caixa|caixa|venda|cupom|or[cç]amento/, icon: "cart", hue: "violet" },
  { match: /shop|loja|varejo|mercado|supermercado/, icon: "store", hue: "blue" },
  { match: /recibo|devolu|troca|cancel/, icon: "receipt", hue: "rose" },
];

const matchTopic = (text?: string | null) => (text ? TOPICS.find((x) => x.match.test(text.toLowerCase())) : undefined);
const validIcon = (k?: string | null) => (k && COVER_ICONS[k] ? k : undefined);
const validColor = (k?: string | null) => (k && COVER_COLORS[k] ? k : undefined);

/** Ícone e cor finais da capa (chaves de COVER_ICONS e COVER_COLORS). */
export function resolveCover(title: string, category?: string | null, choice?: CoverChoice | null, categoryChoice?: CoverChoice | null) {
  const byTitle = matchTopic(title);
  const byCategory = matchTopic(category);
  return {
    icon: validIcon(choice?.cover_icon) ?? byTitle?.icon ?? validIcon(categoryChoice?.cover_icon) ?? byCategory?.icon ?? "cap",
    color: validColor(choice?.cover_color) ?? byTitle?.hue ?? validColor(categoryChoice?.cover_color) ?? byCategory?.hue ?? "violet",
  };
}

/*
  A imagem genérica "Curso SoftcomShop para Diferentes Segmentos" foi enviada
  como capa de vários cursos. Ela conta como "sem capa" para dar lugar à capa
  gerada; qualquer outra imagem enviada no admin continua valendo.
*/
const GENERIC_COVERS = [
  /ChatGPT Image (19|20) de mar\. de 2026, (20_56_32|13_46_25)\.png$/,
  /\/\d+-SG\.png$/,
];

export function isGenericCover(url?: string | null) {
  if (!url) return false;
  let decoded = url;
  try { decoded = decodeURIComponent(url); } catch { /* URL malformada: usa como veio */ }
  return GENERIC_COVERS.some((re) => re.test(decoded));
}

/** URL da capa enviada pelo admin, ou null quando o curso deve usar a capa gerada. */
export function ownCoverUrl(url?: string | null) {
  return url && url.trim() && !isGenericCover(url) ? url : null;
}

interface CourseCoverProps {
  title: string;
  category?: string | null;
  className?: string;
  /** Ícone enviado no admin (trilhas); substitui o ícone do assunto. */
  iconSrc?: string | null;
  /** Escolha feita no admin para este curso (ou trilha). */
  choice?: CoverChoice | null;
  /** Escolha feita no admin para a trilha do curso. */
  categoryChoice?: CoverChoice | null;
  /** Mostra o nome da trilha na capa (padrão: sim). */
  showLabel?: boolean;
}

/** Pasta aberta da marca KA Academy (traço preto grosso, estilo flat). */
function FolderMark() {
  return (
    <svg className="ui-cover__mark" viewBox="0 0 100 80" aria-hidden="true">
      <path d="M10 70V13a4 4 0 0 1 4-4h20l6 7h31a4 4 0 0 1 4 4v8" fill="#F2B705" />
      <path d="M26 28h64a4 4 0 0 1 4 5l-7 33a5 5 0 0 1-5 4H12" fill="#EDE021" />
      <path d="M10 70a8 8 0 0 0 9-6l7-36" fill="none" />
    </svg>
  );
}

export function CourseCover({ title, category, className = "", iconSrc, choice, categoryChoice, showLabel = true }: CourseCoverProps) {
  const { icon, color: hue } = resolveCover(title, category, choice, categoryChoice);
  const Icon = COVER_ICONS[icon].icon;
  return (
    <div className={`ui-cover ${className}`} style={{ ["--cover-tile" as any]: COVER_COLORS[hue].hex }} role="img" aria-label={`Capa de ${title}`}>
      <span className="ui-cover__pattern" aria-hidden="true" />
      <span className="ui-cover__icon" aria-hidden="true">{iconSrc ? <img src={iconSrc} alt="" loading="lazy" /> : <Icon strokeWidth={2.25} />}</span>
      <span className="ui-cover__brand">
        <FolderMark />
        {showLabel && category && <span className="ui-cover__label">{category}</span>}
      </span>
    </div>
  );
}

interface CourseThumbProps extends CourseCoverProps {
  src?: string | null;
  loading?: "lazy" | "eager";
}

/** Mostra a capa enviada; sem ela (ou se falhar ao carregar), a capa gerada. */
export function CourseThumb({ src, loading = "lazy", ...cover }: CourseThumbProps) {
  const url = ownCoverUrl(src);
  const [failed, setFailed] = useState<string | null>(null);
  const className = cover.className || "";
  if (!url || failed === url) return <CourseCover {...cover} />;
  return <img src={url} alt="" loading={loading} className={className || undefined} onError={() => setFailed(url)} />;
}
