import { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "outline";
type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-turquoise-500 text-navy-950 hover:bg-turquoise-400 shadow-lg shadow-turquoise-500/25 hover:shadow-turquoise-400/40",
  secondary:
    "bg-navy-800 text-white hover:bg-navy-700 border border-navy-600",
  outline:
    "border-2 border-turquoise-500 text-turquoise-500 hover:bg-turquoise-500 hover:text-navy-950",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
};

interface BaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

type ButtonProps = BaseProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type AnchorProps = BaseProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

type Props = ButtonProps | AnchorProps;

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: Props) {
  const base = `inline-flex items-center justify-center gap-2 rounded-full font-bold transition-all duration-300 cursor-pointer ${variants[variant]} ${sizes[size]} ${className}`;

  if ("href" in props && props.href) {
    return <a className={base} {...(props as AnchorProps)} />;
  }

  return <button className={base} {...(props as ButtonProps)} />;
}
