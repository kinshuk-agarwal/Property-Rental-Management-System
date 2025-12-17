import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { propertiesAPI, rentalsAPI } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import Card from '../components/Card'

const PropertyDetail = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const [property, setProperty] = useState(null)
  const [tenant, setTenant] = useState(null)
  const [rentalHistory, setRentalHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('details')

  useEffect(() => {
    const fetchPropertyData = async () => {
      try {
        setLoading(true)
        setError('')

        // Fetch property details
        const propertyResponse = await propertiesAPI.getById(id)
        setProperty(propertyResponse.data.property)

        // Fetch tenant details (if user is authorized)
        if (user && (user.role === 'manager' || user.role === 'owner')) {
          try {
            const tenantResponse = await rentalsAPI.getTenant(id)
            setTenant(tenantResponse.data.tenant)
          } catch (tenantError) {
            // Tenant might not exist, that's okay
            setTenant(null)
          }
        }

        // Fetch rental history (if user is authorized)
        if (user && (user.role === 'manager' || user.role === 'owner')) {
          try {
            const historyResponse = await rentalsAPI.getHistory(id)
            setRentalHistory(historyResponse.data.rentals || [])
          } catch (historyError) {
            setRentalHistory([])
          }
        }

      } catch (error) {
        setError(error.response?.data?.message || 'Failed to load property details')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchPropertyData()
    }
  }, [id, user])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <div className="text-center py-8">
            <p className="text-red-600 text-lg mb-4">
              {error || 'Property not found'}
            </p>
            <Link to="/properties/search" className="btn-primary">
              Back to Search
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const tabs = [
    { id: 'details', label: 'Property Details' },
    ...(user && (user.role === 'manager' || user.role === 'owner') ? [
      { id: 'tenant', label: 'Current Tenant' },
      { id: 'history', label: 'Rental History' }
    ] : [])
  ]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/properties/search"
          className="text-primary-600 hover:text-primary-700 mb-4 inline-block"
        >
          ← Back to Search
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">
          Property #{property.id}
        </h1>
        <p className="text-gray-600 mt-2">{property.address}</p>
      </div>

      {/* Price Card */}
      <Card className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-3xl font-bold text-primary-600">
              ₹{property.rent.toLocaleString()}
            </p>
            <p className="text-gray-600">Monthly Rent</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-gray-900">
              ₹{property.hike}% Annual Hike
            </p>
            <p className="text-gray-600">Rent Increase</p>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'details' && (
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Property Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Property ID:</span>
                    <span className="font-medium">{property.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Locality:</span>
                    <span className="font-medium">{property.locality}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Floor:</span>
                    <span className="font-medium">{property.floorNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Area:</span>
                    <span className="font-medium">{property.area} sq ft</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Plinth Area:</span>
                    <span className="font-medium">{property.plinthArea} sq ft</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Year Built:</span>
                    <span className="font-medium">{property.yearOfConstruction}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Available From:</span>
                    <span className="font-medium">
                      {new Date(property.availableFromDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Available Till:</span>
                    <span className="font-medium">
                      {new Date(property.availableTillDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Additional Information</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-600">Property Type:</span>
                    <span className="font-medium ml-2 capitalize">
                      {property.propertyType || 'General'}
                    </span>
                  </div>

                  {property.residentialType && (
                    <div>
                      <span className="text-gray-600">Residential Type:</span>
                      <span className="font-medium ml-2 capitalize">
                        {property.residentialType}
                      </span>
                    </div>
                  )}

                  {property.numberOfBeds && (
                    <div>
                      <span className="text-gray-600">Bedrooms:</span>
                      <span className="font-medium ml-2">{property.numberOfBeds}</span>
                    </div>
                  )}

                  {property.commercialType && (
                    <div>
                      <span className="text-gray-600">Commercial Type:</span>
                      <span className="font-medium ml-2 capitalize">
                        {property.commercialType}
                      </span>
                    </div>
                  )}

                  {property.facilities && property.facilities.length > 0 && (
                    <div>
                      <span className="text-gray-600 block mb-2">Facilities:</span>
                      <div className="flex flex-wrap gap-2">
                        {property.facilities.map((facility, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-primary-100 text-primary-800 rounded-full text-sm"
                          >
                            {facility}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'tenant' && (
          <Card>
            <h3 className="text-lg font-semibold mb-4">Current Tenant</h3>
            {tenant ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{tenant.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Aadhar:</span>
                  <span className="font-medium">{tenant.aadhar}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Age:</span>
                  <span className="font-medium">{tenant.age}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Username:</span>
                  <span className="font-medium">{tenant.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Address:</span>
                  <span className="font-medium">
                    {tenant.doorNo}, {tenant.street}, {tenant.state} - {tenant.pincode}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No current tenant for this property</p>
            )}
          </Card>
        )}

        {activeTab === 'history' && (
          <Card>
            <h3 className="text-lg font-semibold mb-4">Rental History</h3>
            {rentalHistory.length > 0 ? (
              <div className="space-y-4">
                {rentalHistory.map((rental, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-gray-600 text-sm">Tenant ID</span>
                        <p className="font-medium">{rental.tenantId}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 text-sm">Start Date</span>
                        <p className="font-medium">
                          {new Date(rental.startDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600 text-sm">End Date</span>
                        <p className="font-medium">
                          {rental.endDate ? new Date(rental.endDate).toLocaleDateString() : 'Ongoing'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600 text-sm">Monthly Rent</span>
                        <p className="font-medium">₹{rental.monthlyRent.toLocaleString()}</p>
                      </div>
                    </div>
                    {rental.commission && (
                      <div className="mt-2">
                        <span className="text-gray-600 text-sm">Commission: </span>
                        <span className="font-medium">₹{rental.commission.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No rental history available</p>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}

export default PropertyDetail
