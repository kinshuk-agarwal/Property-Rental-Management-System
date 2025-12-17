import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { propertiesAPI, rentalsAPI } from '../utils/api'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'

const OwnerDashboard = () => {
  const { user } = useAuth()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [rentalHistory, setRentalHistory] = useState([])
  const [currentTenant, setCurrentTenant] = useState(null)
  const [formData, setFormData] = useState({
    availableFromDate: '',
    availableTillDate: '',
    area: '',
    plinthArea: '',
    rent: '',
    hike: '',
    floorNo: '',
    locality: '',
    address: '',
    yearOfConstruction: ''
  })

  useEffect(() => {
    if (user) {
      fetchProperties()
    }
  }, [user])

  const fetchProperties = async () => {
    if (!user?.aadhar) {
      setLoading(false)
      return
    }

    try {
      const response = await propertiesAPI.getByOwner(user.aadhar)
      setProperties(response.data.properties || [])
    } catch (error) {
      console.error('Error fetching properties:', error)
      setProperties([])
      // Don't show error to user for now
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleAddProperty = async (e) => {
    e.preventDefault()
    try {
      await propertiesAPI.create(formData)
      setShowAddForm(false)
      setFormData({
        availableFromDate: '',
        availableTillDate: '',
        area: '',
        plinthArea: '',
        rent: '',
        hike: '',
        floorNo: '',
        locality: '',
        address: '',
        yearOfConstruction: ''
      })
      fetchProperties()
    } catch (error) {
      console.error('Error adding property:', error)
      alert('Failed to add property')
    }
  }

  const viewPropertyDetails = async (property) => {
    setSelectedProperty(property)
    try {
      // Get rental history
      const historyResponse = await rentalsAPI.getHistory(property.id)
      setRentalHistory(historyResponse.data.rentals)

      // Get current tenant
      const tenantResponse = await rentalsAPI.getTenant(property.id)
      setCurrentTenant(tenantResponse.data.tenant)
    } catch (error) {
      console.error('Error fetching property details:', error)
    }
  }

  const closePropertyDetails = () => {
    setSelectedProperty(null)
    setRentalHistory([])
    setCurrentTenant(null)
  }

  if (loading) {
    return <div className="text-center">Loading...</div>
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Owner Dashboard</h1>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {showAddForm ? 'Cancel' : 'Add New Property'}
        </Button>
      </div>

      {/* Add Property Form */}
      {showAddForm && (
        <Card className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Add New Property</h2>
          <form onSubmit={handleAddProperty} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Available From Date"
              type="date"
              name="availableFromDate"
              value={formData.availableFromDate}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Available Till Date"
              type="date"
              name="availableTillDate"
              value={formData.availableTillDate}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Area (sq ft)"
              type="number"
              step="0.01"
              name="area"
              value={formData.area}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Plinth Area (sq ft)"
              type="number"
              step="0.01"
              name="plinthArea"
              value={formData.plinthArea}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Monthly Rent"
              type="number"
              step="0.01"
              name="rent"
              value={formData.rent}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Hike (%)"
              type="number"
              step="0.01"
              name="hike"
              value={formData.hike}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Floor Number"
              type="number"
              name="floorNo"
              value={formData.floorNo}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Locality"
              name="locality"
              value={formData.locality}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Year of Construction"
              type="number"
              name="yearOfConstruction"
              value={formData.yearOfConstruction}
              onChange={handleInputChange}
              required
            />
            <div className="md:col-span-2">
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                Add Property
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Properties List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => (
          <Card key={property.id} className="hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold mb-2">{property.locality}</h3>
            <p className="text-gray-600 text-sm mb-2">{property.address}</p>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Area:</span> {property.area} sq ft</p>
              <p><span className="font-medium">Rent:</span> ₹{property.rent}/month</p>
              <p><span className="font-medium">Floor:</span> {property.floorNo}</p>
              <p><span className="font-medium">Year:</span> {property.yearOfConstruction}</p>
            </div>
            <Button
              onClick={() => viewPropertyDetails(property)}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
            >
              View Details
            </Button>
          </Card>
        ))}
      </div>

      {properties.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No properties added yet.</p>
          <p className="text-gray-400 mt-2">Click "Add New Property" to get started.</p>
        </div>
      )}

      {/* Property Details Modal */}
      {selectedProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Property Details</h2>
                <Button
                  onClick={closePropertyDetails}
                  className="bg-gray-500 hover:bg-gray-600"
                >
                  Close
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Property Information</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Address:</span> {selectedProperty.address}</p>
                    <p><span className="font-medium">Locality:</span> {selectedProperty.locality}</p>
                    <p><span className="font-medium">Area:</span> {selectedProperty.area} sq ft</p>
                    <p><span className="font-medium">Plinth Area:</span> {selectedProperty.plinthArea} sq ft</p>
                    <p><span className="font-medium">Monthly Rent:</span> ₹{selectedProperty.rent}</p>
                    <p><span className="font-medium">Hike:</span> {selectedProperty.hike}%</p>
                    <p><span className="font-medium">Floor:</span> {selectedProperty.floorNo}</p>
                    <p><span className="font-medium">Year Built:</span> {selectedProperty.yearOfConstruction}</p>
                    <p><span className="font-medium">Available:</span> {selectedProperty.availableFromDate} to {selectedProperty.availableTillDate}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Current Tenant</h3>
                  {currentTenant ? (
                    <div className="space-y-2">
                      <p><span className="font-medium">Name:</span> {currentTenant.name}</p>
                      <p><span className="font-medium">Username:</span> {currentTenant.username}</p>
                      <p><span className="font-medium">Age:</span> {currentTenant.age}</p>
                      <p><span className="font-medium">Address:</span> {currentTenant.doorNo}, {currentTenant.street}, {currentTenant.state} - {currentTenant.pincode}</p>
                    </div>
                  ) : (
                    <p className="text-gray-500">No current tenant</p>
                  )}

                  <h3 className="text-lg font-semibold mb-3 mt-6">Rental History</h3>
                  {rentalHistory.length > 0 ? (
                    <div className="space-y-3">
                      {rentalHistory.map((rental, index) => (
                        <div key={index} className="border rounded p-3">
                          <p><span className="font-medium">Tenant ID:</span> {rental.tenantId}</p>
                          <p><span className="font-medium">Period:</span> {rental.startDate} to {rental.endDate || 'Present'}</p>
                          <p><span className="font-medium">Monthly Rent:</span> ₹{rental.monthlyRent}</p>
                          {rental.commission && <p><span className="font-medium">Commission:</span> ₹{rental.commission}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No rental history</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OwnerDashboard

