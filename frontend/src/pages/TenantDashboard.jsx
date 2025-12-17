import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { rentalsAPI, rentalRequestsAPI, propertiesAPI } from '../utils/api'
import Button from '../components/Button'
import Card from '../components/Card'
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Home, Clock, MapPin, IndianRupee, Calendar, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const TenantDashboard = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [activeRentals, setActiveRentals] = useState([])
  const [rentalRequests, setRentalRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [properties, setProperties] = useState([])
  const [requesting, setRequesting] = useState(null)

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    try {
      // Fetch active rentals
      const rentalsResponse = await rentalsAPI.getTenantActive()
      setActiveRentals(rentalsResponse.data.rentals || [])

      // Fetch rental requests
      const requestsResponse = await rentalRequestsAPI.getAll()
      setRentalRequests(requestsResponse.data.requests || [])

      // Fetch available properties
      const propertiesResponse = await propertiesAPI.getAll()
      setProperties(propertiesResponse.data.properties || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRentalRequest = async (propertyId) => {
    setRequesting(propertyId)
    try {
      await rentalRequestsAPI.create({ propertyId, tenantId: user.aadhar })
      await fetchDashboardData() // Refresh data
      toast({
        title: "Success",
        description: "Rental request submitted successfully!",
      })
    } catch (error) {
      console.error('Error submitting rental request:', error)
      toast({
        title: "Error",
        description: "Failed to submit rental request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setRequesting(null)
    }
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { variant: "secondary", icon: Clock },
      approved: { variant: "default", icon: CheckCircle },
      rejected: { variant: "destructive", icon: AlertCircle },
    }

    const config = statusConfig[status.toLowerCase()] || statusConfig.pending
    const IconComponent = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.name}!</h1>
        <p className="text-muted-foreground">Manage your rentals and explore new properties</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <Card.Header className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Card.Title className="text-sm font-medium">Active Rentals</Card.Title>
            <Home className="h-4 w-4 text-muted-foreground" />
          </Card.Header>
          <Card.Content>
            <div className="text-2xl font-bold">{activeRentals.length}</div>
            <p className="text-xs text-muted-foreground">
              Properties you're currently renting
            </p>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Card.Title className="text-sm font-medium">Pending Requests</Card.Title>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </Card.Header>
          <Card.Content>
            <div className="text-2xl font-bold">
              {rentalRequests.filter(r => r.status.toLowerCase() === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Rental requests awaiting approval
            </p>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Card.Title className="text-sm font-medium">Available Properties</Card.Title>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </Card.Header>
          <Card.Content>
            <div className="text-2xl font-bold">{properties.length}</div>
            <p className="text-xs text-muted-foreground">
              Properties you can apply for
            </p>
          </Card.Content>
        </Card>
      </div>

      {/* Active Rentals */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">My Active Rentals</h2>
        </div>
        <Separator />
        {activeRentals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeRentals.map((rental) => (
              <Card key={rental.id} className="hover:shadow-md transition-shadow">
                <Card.Header>
                  <div className="flex items-center space-x-2">
                    <Home className="h-5 w-5 text-primary" />
                    <Card.Title>Active Rental</Card.Title>
                  </div>
                  <Card.Description>Property #{rental.propertyId}</Card.Description>
                </Card.Header>
                <Card.Content className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm">
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">₹{rental.monthlyRent}/month</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Started: {new Date(rental.startDate).toLocaleDateString()}</span>
                  </div>
                  <Badge variant="default" className="w-fit">Active</Badge>
                </Card.Content>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Rentals</h3>
            <p className="text-muted-foreground">You don't have any active rental agreements yet.</p>
          </Card>
        )}
      </div>

      {/* Rental Requests */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">My Rental Requests</h2>
        </div>
        <Separator />
        {rentalRequests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rentalRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <Card.Header>
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-primary" />
                    <Card.Title>Rental Request</Card.Title>
                  </div>
                  <Card.Description>Property #{request.propertyId}</Card.Description>
                </Card.Header>
                <Card.Content className="space-y-3">
                  <div className="flex items-center justify-between">
                    {getStatusBadge(request.status)}
                    <span className="text-sm text-muted-foreground">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </Card.Content>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Rental Requests</h3>
            <p className="text-muted-foreground">You haven't submitted any rental requests yet.</p>
          </Card>
        )}
      </div>

      {/* Available Properties */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Available Properties</h2>
        </div>
        <Separator />
        {properties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <Card key={property.id} className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                <Card.Header>
                  <Card.Title className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>{property.locality}</span>
                  </Card.Title>
                  <Card.Description className="text-sm">{property.address}</Card.Description>
                </Card.Header>
                <Card.Content className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <span>{property.area} sq ft</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <IndianRupee className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">₹{property.rent}/month</span>
                    </div>
                  </div>
                </Card.Content>
                <Card.Footer>
                  <Button
                    onClick={() => handleRentalRequest(property.id)}
                    disabled={requesting === property.id}
                    className="w-full"
                  >
                    {requesting === property.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Requesting...
                      </>
                    ) : (
                      'Request Rental'
                    )}
                  </Button>
                </Card.Footer>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Properties Available</h3>
            <p className="text-muted-foreground">There are no properties available for rent at the moment.</p>
          </Card>
        )}
      </div>
    </div>
  )
}

export default TenantDashboard