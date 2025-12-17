import { Button as ShadcnButton } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

const Button = ({
  children,
  variant = 'default',
  size = 'default',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className = '',
  ...props
}) => {
  // Map old variants to new shadcn variants
  const variantMap = {
    primary: 'default',
    secondary: 'secondary',
    outline: 'outline',
    danger: 'destructive'
  }

  // Map old sizes to new shadcn sizes
  const sizeMap = {
    sm: 'sm',
    md: 'default',
    lg: 'lg'
  }

  return (
    <ShadcnButton
      type={type}
      variant={variantMap[variant] || variant}
      size={sizeMap[size] || size}
      disabled={disabled || loading}
      onClick={onClick}
      className={className}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </ShadcnButton>
  )
}

export default Button
