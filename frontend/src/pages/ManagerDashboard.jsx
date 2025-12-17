import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { rentalRequestsAPI, usersAPI, propertiesAPI, rentalsAPI, logsAPI, notificationsAPI } from '../utils/api'
import Button from '../components/Button'
import Card from '../components/Card'
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

const ManagerDashboard = () => {
  const { user } = useAuth()
  const [rentalRequests, setRentalRequests] = useState([])
  const [users, setUsers] = useState([])
  const [properties, setProperties] = useState([])
  const [rentals, setRentals] = useState([])
  const [logs, setLogs] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    try {
      const [requestsResponse, usersResponse, propertiesResponse, rentalsResponse, logsResponse, notificationsResponse] = await Promise.all([
        rentalRequestsAPI.getAll(),
        usersAPI.getAll(),
        propertiesAPI.getAll(),
        rentalsAPI.getAll(),
        logsAPI.getAll(),
        notificationsAPI.getAll()
      ])

      setRentalRequests(requestsResponse.data.requests || [])
      setUsers(usersResponse.data.users || [])
      setProperties(propertiesResponse.data.properties || [])
      setRentals(rentalsResponse.data.rentals || [])
      setLogs(logsResponse.data.logs || [])
      setNotifications(notificationsResponse.data.notifications || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveRequest = async (requestId) => {
    try {
      await rentalRequestsAPI.approve(requestId)
      fetchDashboardData()
      alert('Rental request approved!')
    } catch (error) {
      console.error('Error approving request:', error)
      alert('Failed to approve request: ' + (error.response?.data?.message || error.message))
    }
  }

  const handleRejectRequest = async (requestId, reason) => {
    try {
      await rentalRequestsAPI.reject(requestId, { reason })
      fetchDashboardData()
      alert('Rental request rejected!')
    } catch (error) {
      console.error('Error rejecting request:', error)
      alert('Failed to reject request')
    }
  }

  const handleMarkNotificationRead = async (notificationId) => {
    try {
      await notificationsAPI.markRead(notificationId)
      fetchDashboardData()
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
    </div>
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <h1 className="text-4xl font-bold mb-8">Manager Dashboard</h1>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Users</h3>
          <p className="text-3xl font-bold text-primary">{users.length}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Properties</h3>
          <p className="text-3xl font-bold text-green-600">{properties.length}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Active Rentals</h3>
          <p className="text-3xl font-bold text-blue-600">{rentals.length}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Pending Requests</h3>
          <p className="text-3xl font-bold text-orange-600">
            {rentalRequests.filter(r => r.status === 'pending').length}
          </p>
        </Card>
      </div>

      {/* Rental Requests */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Rental Requests</h2>
        {rentalRequests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rentalRequests.map((request) => (
              <Card key={request.requestId} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">
                      {request.propertyDetails?.locality || 'Property'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {request.propertyDetails?.address || ''}
                    </p>
                  </div>
                  <Badge variant={
                    request.status === 'pending' ? 'default' :
                    request.status === 'approved' ? 'secondary' : 
                    'destructive'
                  }>
                    {request.status}
                  </Badge>
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-2 text-sm mb-4">
                  <p><span className="font-medium">Tenant:</span> {request.tenantName}</p>
                  <p><span className="font-medium">Property ID:</span> {request.propertyId}</p>
                  <p><span className="font-medium">Rent:</span> ₹{request.propertyDetails?.rent?.toLocaleString()}</p>
                  <p><span className="font-medium">Request Date:</span> {new Date(request.requestDate).toLocaleDateString()}</p>
                  {request.reviewedByName && (
                    <p><span className="font-medium">Reviewed By:</span> {request.reviewedByName}</p>
                  )}
                </div>
                
                {request.status === 'pending' && (
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleApproveRequest(request.requestId)}
                      className="bg-green-600 hover:bg-green-700 flex-1"
                    >
                      Approve
                    </Button>
                    <Button
                      onClick={() => {
                        const reason = prompt('Reason for rejection:')
                        if (reason) handleRejectRequest(request.requestId, reason)
                      }}
                      className="bg-red-600 hover:bg-red-700 flex-1"
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No rental requests</p>
          </Card>
        )}
      </div>

      {/* Properties Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">All Properties</h2>
        {properties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <Card key={property.id} className="p-6">
                <h3 className="text-lg font-semibold mb-2">{property.locality}</h3>
                <p className="text-sm text-muted-foreground mb-3">{property.address}</p>
                <Separator className="my-3" />
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Owner:</span> {property.ownerName}</p>
                  <p><span className="font-medium">Area:</span> {property.area} sq ft</p>
                  <p><span className="font-medium">Rent:</span> ₹{property.rent?.toLocaleString()}/month</p>
                  <p><span className="font-medium">Floor:</span> {property.floorNo}</p>
                  <p><span className="font-medium">Year:</span> {property.yearOfConstruction}</p>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No properties registered</p>
          </Card>
        )}
      </div>

      {/* User Management */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">User Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Owners</h3>
            <p className="text-2xl font-bold text-green-600">
              {users.filter(u => u.role === 'owner').length}
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Tenants</h3>
            <p className="text-2xl font-bold text-purple-600">
              {users.filter(u => u.role === 'tenant').length}
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Managers</h3>
            <p className="text-2xl font-bold text-blue-600">
              {users.filter(u => u.role === 'manager').length}
            </p>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Age</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <tr key={user.aadhar} className="hover:bg-muted/50">
                    <td className="px-6 py-4 text-sm">{user.name}</td>
                    <td className="px-6 py-4 text-sm">{user.username}</td>
                    <td className="px-6 py-4 text-sm">
                      <Badge variant={
                        user.role === 'owner' ? 'default' :
                        user.role === 'tenant' ? 'secondary' :
                        'outline'
                      }>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm">{user.age}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Notifications */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Notifications</h2>
        {notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.slice(0, 5).map((notification) => (
              <Card key={notification.id} className={`p-4 ${notification.isRead ? 'bg-muted/30' : 'bg-primary/5'}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium">{notification.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <Button
                      onClick={() => handleMarkNotificationRead(notification.id)}
                      size="sm"
                      variant="outline"
                    >
                      Mark Read
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No notifications</p>
          </Card>
        )}
      </div>
    </div>
  )
}

export default ManagerDashboard