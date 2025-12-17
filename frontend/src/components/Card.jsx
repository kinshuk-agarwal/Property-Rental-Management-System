import {
  Card as ShadcnCard,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from "@/components/ui/card"

const Card = ({ children, className = '', ...props }) => {
  return (
    <ShadcnCard className={className} {...props}>
      {children}
    </ShadcnCard>
  )
}

const CardBody = ({ children, className = '' }) => {
  return (
    <CardContent className={className}>
      {children}
    </CardContent>
  )
}

Card.Header = CardHeader
Card.Title = CardTitle
Card.Description = CardDescription
Card.Body = CardBody
Card.Content = CardContent
Card.Footer = CardFooter

export default Card
