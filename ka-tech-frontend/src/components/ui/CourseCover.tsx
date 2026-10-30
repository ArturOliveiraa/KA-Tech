import React, { useState } from "react";
import {
  BarChart3, Boxes, CreditCard, FileText, GraduationCap, Pill, Plug, Printer, Receipt,
  Settings, Shirt, ShoppingCart, Store, Truck, Tv, Users, UtensilsCrossed, Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/*
  Capa de curso gerada pelo próprio site (sem arquivo de imagem).
  Segue a marca KA Academy (amarelo, laranja e contorno preto).
  O assunto sai do título (ou da trilha) e define o ícone e a cor do quadro, então o mesmo
  curso fica igual no dashboard, na trilha e no admin.
*/

interface Topic {
  match: RegExp;
  icon: LucideIcon;
  hue: string;
}

// A ordem importa: o primeiro assunto que casar vence.
const TOPICS: Topic[] = [
  { match: /restaurante|food|delivery|comanda|mesa|lanchonete|bar\b|card[aá]pio|cozinha/, icon: UtensilsCrossed, hue: "amber" },
  { match: /farm[aá]cia|drogaria|medicamento|rem[eé]dio/, icon: Pill, hue: "emerald" },
  { match: /vestu[aá]rio|moda|roupa|confec|cal[cç]ado|grade/, icon: Shirt, hue: "teal" },
  { match: /nota|nf-?e|nfc-?e|fiscal|tribut|sped|imposto|xml|cfop|ncm/, icon: FileText, hue: "blue" },
  { match: /financeir|contas? a|boleto|pix|banco|concilia|fluxo de caixa|cobran/, icon: Wallet, hue: "green" },
  { match: /relat[oó]rio|indicador|dashboard|gr[aá]fico|bi\b|an[aá]lise/, icon: BarChart3, hue: "indigo" },
  { match: /estoque|invent[aá]rio|produto|cadastro de item|mercadoria/, icon: Boxes, hue: "orange" },
  { match: /compra|fornecedor|pedido de compra|entrada/, icon: Truck, hue: "cyan" },
  { match: /cliente|crm|fideli|credi[aá]rio/, icon: Users, hue: "pink" },
  { match: /cart[aã]o|tef|pagamento|maquininha/, icon: CreditCard, hue: "violet" },
  { match: /etiqueta|impressora|impress[aã]o|balan[cç]a|perif/, icon: Printer, hue: "slate" },
  { match: /integra|e-?commerce|marketplace|api\b|loja virtual/, icon: Plug, hue: "cyan" },
  { match: /configura|instala|certificado|par[aâ]metro|usu[aá]rio|permiss/, icon: Settings, hue: "slate" },
  { match: /live|ao vivo|webinar/, icon: Tv, hue: "rose" },
  { match: /pdv|frente de caixa|caixa|venda|cupom|or[cç]amento/, icon: ShoppingCart, hue: "violet" },
  { match: /shop|loja|varejo|mercado|supermercado/, icon: Store, hue: "blue" },
  { match: /recibo|devolu|troca|cancel/, icon: Receipt, hue: "rose" },
];

const FALLBACK: Omit<Topic, "match"> = { icon: GraduationCap, hue: "violet" };

function topicFor(title: string, category?: string | null) {
  const norm = (s: string) => s.toLowerCase();
  const t = norm(title);
  const c = category ? norm(category) : "";
  return TOPICS.find((x) => x.match.test(t)) || (c && TOPICS.find((x) => x.match.test(c))) || FALLBACK;
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

export function CourseCover({ title, category, className = "", iconSrc }: CourseCoverProps) {
  const { icon: Icon, hue } = topicFor(title, category);
  return (
    <div className={`ui-cover ui-cover--${hue} ${className}`} role="img" aria-label={`Capa de ${title}`}>
      <span className="ui-cover__pattern" aria-hidden="true" />
      <span className="ui-cover__icon" aria-hidden="true">{iconSrc ? <img src={iconSrc} alt="" loading="lazy" /> : <Icon strokeWidth={2.25} />}</span>
      <span className="ui-cover__brand">
        <FolderMark />
        {category && <span className="ui-cover__label">{category}</span>}
      </span>
    </div>
  );
}

interface CourseThumbProps extends CourseCoverProps {
  src?: string | null;
  loading?: "lazy" | "eager";
}

/** Mostra a capa enviada; sem ela (ou se falhar ao carregar), a capa gerada. */
export function CourseThumb({ src, title, category, className = "", loading = "lazy" }: CourseThumbProps) {
  const url = ownCoverUrl(src);
  const [failed, setFailed] = useState<string | null>(null);
  if (!url || failed === url) return <CourseCover title={title} category={category} className={className} />;
  return <img src={url} alt="" loading={loading} className={className || undefined} onError={() => setFailed(url)} />;
}
