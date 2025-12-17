import { Input as ShadcnInput } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const Input = ({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  required = false,
  className = '',
  ...props
}) => {
  return (
    <div className="mb-4">
      {label && (
        <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2 block">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <ShadcnInput
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`${error ? 'border-red-500 focus-visible:ring-red-500' : ''} ${className}`}
        {...props}
      />
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  )
}

export default Input
