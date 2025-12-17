import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { propertiesAPI } from '../utils/api'
import Input from '../components/Input'
import Button from '../components/Button'
import Card from '../components/Card'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Search,
  MapPin,
  Home,
  IndianRupee,
  Calendar,
  Hash,
  Building,
  AlertCircle,
  Loader2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const PropertySearch = () => {
  const [locality, setLocality] = useState('')
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')

  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef(null)

  const { toast } = useToast()

  const fetchSuggestions = async (searchText) => {
    if (!searchText || searchText.trim().length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setIsSearching(true)
    try {
      const response = await propertiesAPI.search(searchText.trim())
      const uniqueLocalities = [...new Set(response.data.properties.map(p => ({
        locality: p.locality,
        address: p.address,
        id: p.id,
        count: response.data.properties.filter(prop => prop.locality === p.locality).length
      })))]
      
      // Group by locality
      const grouped = uniqueLocalities.reduce((acc, curr) => {
        const existing = acc.find(item => item.locality === curr.locality)
        if (!existing) {
          acc.push(curr)
        }
        return acc
      }, [])
      
      setSuggestions(grouped.slice(0, 5))
      setShowSuggestions(true)
    } catch (error) {
      console.error('Error fetching suggestions:', error)
      setSuggestions([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleInputChange = (e) => {
    const value = e.target.value
    setLocality(value)
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      fetchSuggestions(value)
    }, 300)
  }

  const selectSuggestion = (suggestionLocality) => {
    setLocality(suggestionLocality)
    setShowSuggestions(false)
    setSuggestions([])
  }

  const handleSearch = async (e) => {
    e.preventDefault()

    if (!locality.trim()) {
      setError('Please enter a locality to search')
      return
    }

    setLoading(true)
    setError('')
    setSearched(false)

    try {
      const response = await propertiesAPI.search(locality.trim())
      setProperties(response.data.properties || [])
      setSearched(true)

      if (response.data.properties?.length === 0) {
        toast({
          title: "No properties found",
          description: `No properties available in "${locality}". Try a different location.`,
          variant: "default",
        })
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to search properties'
      setError(errorMessage)
      setProperties([])
      setSearched(true)

      toast({
        title: "Search failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-3 bg-primary/10 rounded-full">
            <Search className="h-8 w-8 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Find Your Perfect Property</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Search through our extensive collection of rental properties across different localities
          </p>
        </div>
      </div>

      {/* Search Form */}
      <Card className="max-w-2xl mx-auto">
        <Card.Content className="pt-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
  <div className="flex-1 relative">
    <Input
      label=""
      type="text"
      placeholder="Enter locality (e.g., Downtown, Midtown)"
      value={locality}
      onChange={handleInputChange}
      onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
      error={error}
      className="text-base"
    />
    
    {/* Autocomplete Dropdown */}
    {showSuggestions && suggestions.length > 0 && (
      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
        {isSearching ? (
          <div className="p-3 text-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
            Searching...
          </div>
        ) : (
          suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
              onClick={() => selectSuggestion(suggestion.locality)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{suggestion.locality}</p>
                    <p className="text-xs text-muted-foreground">{suggestion.address}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {suggestion.count} {suggestion.count === 1 ? 'property' : 'properties'}
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>
    )}
  </div>
  
  <div className="flex items-end">
    <Button
      type="submit"
      size="lg"
      loading={loading}
      disabled={loading}
      className="w-full sm:w-auto"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Searching...
        </>
      ) : (
        <>
          <Search className="h-4 w-4 mr-2" />
          Search
        </>
      )}
    </Button>
  </div>
</div>
          </form>
        </Card.Content>
      </Card>

      {/* Search Results */}
      {searched && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Search Results</h2>
              <p className="text-muted-foreground">
                {properties.length === 0
                  ? `No properties found in "${locality}"`
                  : `${properties.length} propert${properties.length === 1 ? 'y' : 'ies'} found in "${locality}"`
                }
              </p>
            </div>
            {properties.length > 0 && (
              <Badge variant="secondary" className="w-fit">
                {properties.length} result{properties.length === 1 ? '' : 's'}
              </Badge>
            )}
          </div>

          <Separator />

          {properties.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 bg-muted rounded-full">
                    <AlertCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">No properties found</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    We couldn't find any properties in "{locality}". Try searching with a different locality or check back later.
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
                <Link 
                  key={property.id} 
                  to={`/properties/${property.id}`}
                  className="block"
                >
                  <Card className="p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-primary mb-1">
                            {property.locality}
                          </h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {property.address}
                          </p>
                        </div>
                        <Badge variant="secondary" className="ml-2">
                          <Home className="h-3 w-3 mr-1" />
                          {property.floorNo ? `Floor ${property.floorNo}` : 'Ground'}
                        </Badge>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground text-xs">Area</p>
                            <p className="font-medium">{property.area} sq ft</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <IndianRupee className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground text-xs">Rent</p>
                            <p className="font-medium text-primary">₹{property.rent.toLocaleString()}/mo</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground text-xs">Plinth Area</p>
                            <p className="font-medium">{property.plinthArea} sq ft</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground text-xs">Built</p>
                            <p className="font-medium">{property.yearOfConstruction}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <p className="text-sm text-muted-foreground">
                          Annual Hike: <span className="font-medium text-foreground">{property.hike}%</span>
                        </p>
                        <Button variant="ghost" size="sm" className="group">
                          View Details
                          <svg className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PropertySearch
