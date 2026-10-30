import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ArrowLeftRight, Calendar, MapPin, Search, Bus, Plane, PlaneTakeoff, Home, List, HelpCircle, User, Train } from "lucide-react";
import HomeBanner from "@/assets/Home3.png";
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import CarImg from "@/assets/CarBar.png";
import BusImg from "@/assets/BusBar.png";
import React from "react";
import LocationAutocomplete from "./LocationAutocomplete";
import { getDefaultDate } from "@/lib/utils";
import { resolveLocationCoordinates } from "@/lib/distanceUtils";
import { googleMapsService } from "@/services/googleMapsService";

const LoadingAnimation = () => (
  <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
    <div className="flex space-x-8 animate-pulse">
      <img src={CarImg} alt="Car" className="w-20 h-20 object-contain animate-bounce" style={{ animationDelay: '0ms' }} />
      <img src={BusImg} alt="Bus" className="w-20 h-20 object-contain animate-bounce" style={{ animationDelay: '200ms' }} />
    </div>
    <div className="mt-6 text-xl font-semibold text-primary">Searching best Vehicle for you...</div>
  </div>
);

const HeroSection = () => {
  const navigate = useNavigate();
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [departureDate, setDepartureDate] = useState(() => getDefaultDate(1));
  const [returnDate, setReturnDate] = useState(() => getDefaultDate(2));
  const [pickupTime, setPickupTime] = useState("09:00");
  const [selectedDate, setSelectedDate] = useState("04");
  const [activeService, setActiveService] = useState("oneWay");
  const [womenBooking, setWomenBooking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  // Store selected location data with coordinates
  const [fromLocationData, setFromLocationData] = useState<{
    lat: number;
    lng: number;
    description: string;
  } | null>(null);
  const [toLocationData, setToLocationData] = useState<{
    lat: number;
    lng: number;
    description: string;
  } | null>(null);

  const fullText = "CHALO SAWARI";
  const blueText = "SAWARI";

  // Animation trigger on mount
  useEffect(() => {
    setIsVisible(true);
  }, []);




  // Typing animation effect
  useEffect(() => {
    if (isVisible && currentIndex < fullText.length) {
      const timeout = setTimeout(() => {
        setTypedText(fullText.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, 150); // Speed of typing (150ms per character)

      return () => clearTimeout(timeout);
    }
  }, [isVisible, currentIndex, fullText]);

  const handleSwapLocations = () => {
    const temp = fromLocation;
    const tempData = fromLocationData;

    setFromLocation(toLocation);
    setToLocation(temp);
    setFromLocationData(toLocationData);
    setToLocationData(tempData);
  };

  const handleSearch = async () => {
    // Validate required fields
    if (!fromLocation.trim() || !toLocation.trim()) {
      alert("Please select both departure and destination locations");
      return;
    }

    if (!departureDate) {
      alert("Please select pickup date");
      return;
    }

    if (!pickupTime) {
      alert("Please select pickup time");
      return;
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(departureDate)) {
      alert("Please select a valid pickup date");
      return;
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(pickupTime)) {
      alert("Please select a valid pickup time");
      return;
    }

    // Validate return date for round trip
    if (activeService === "roundTrip" && !returnDate) {
      alert("Please select return date for round trip");
      return;
    }

    if (activeService === "roundTrip" && returnDate) {
      const returnDateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!returnDateRegex.test(returnDate)) {
        alert("Please select a valid return date");
        return;
      }

      // Check if return date is after departure date
      const departure = new Date(departureDate);
      const returnD = new Date(returnDate);
      if (returnD <= departure) {
        alert("Return date must be after departure date");
        return;
      }
    }

    // Auto-resolve coordinates if not already present
    let resolvedFromData = fromLocationData;
    let resolvedToData = toLocationData;

    if (!resolvedFromData) {
      resolvedFromData = await resolveLocationCoordinates(fromLocation);
      setFromLocationData(resolvedFromData);
    }
    if (!resolvedToData) {
      resolvedToData = await resolveLocationCoordinates(toLocation);
      setToLocationData(resolvedToData);
    }

    const searchState = {
      from: fromLocation,
      to: toLocation,
      fromData: resolvedFromData,
      toData: resolvedToData,
      pickupDate: departureDate,
      pickupTime: pickupTime,
      serviceType: activeService,
      returnDate: activeService === "roundTrip" ? returnDate : null
    };

    console.log('Debug - HeroSection navigating with search state:', searchState);

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      navigate('/vehicle-search', {
        state: searchState
      });
    }, 1200);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    // Update the actual date value based on selected date
    const daysOffset = parseInt(date);
    setDepartureDate(getDefaultDate(daysOffset));
  };

  // Function to render text with blue highlight for "SAWARI"
  const renderTypedText = () => {
    const parts = [];
    let currentPart = "";

    for (let i = 0; i < typedText.length; i++) {
      const char = typedText[i];
      currentPart += char;

      // Check if we've completed "CHALO " and are starting "SAWARI"
      if (typedText.slice(0, i + 1) === "CHALO " && i === 5) {
        parts.push(<span key={`part-${i}`} className="text-black">{currentPart}</span>);
        currentPart = "";
      }
      // Check if we're in the "SAWARI" part
      else if (typedText.slice(0, 6) === "CHALO " && i >= 6) {
        if (currentPart === "SAWARI") {
          parts.push(<span key={`part-${i}`} className="text-blue-600 animate-pulse">{currentPart}</span>);
          currentPart = "";
        }
      }
    }

    // Add any remaining text
    if (currentPart) {
      const isBluePart = typedText.startsWith("CHALO ") && typedText.length > 6;
      parts.push(
        <span key="remaining" className={isBluePart ? "text-blue-600 animate-pulse" : "text-black"}>
          {currentPart}
        </span>
      );
    }

    return parts;
  };

  return (
    <section className="relative flex flex-col bg-white">
      {loading && <LoadingAnimation />}

      {/* Mobile App Layout Container */}
      <div className="w-full max-w-md md:max-w-xl mx-auto flex flex-col flex-1 pt-3">
        {/* Main Content */}
        <div className="p-4 space-y-4 pb-6 bg-gray-50/60 rounded-2xl mx-2 sm:mx-0 border border-gray-100/80 shadow-xs">
          {/* Main Booking Card */}
          <Card className="p-4 sm:p-5 bg-white shadow-sm rounded-2xl border border-gray-200/80">
            {/* From Field */}
            <div className="mb-3.5 relative group">
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">From</label>
              <LocationAutocomplete
                value={fromLocation}
                onChange={setFromLocation}
                onLocationSelect={async (location) => {
                  setFromLocation(location.description);

                  if (location.place_id === 'current_location' && 'lat' in location && 'lng' in location) {
                    const coords = {
                      lat: (location as any).lat,
                      lng: (location as any).lng,
                      description: location.description
                    };
                    setFromLocationData(coords);
                  } else {
                    try {
                      const placeDetails = await googleMapsService.getPlaceDetails(location.place_id);
                      if (placeDetails && placeDetails.geometry && placeDetails.geometry.location) {
                        const coords = {
                          lat: placeDetails.geometry.location.lat(),
                          lng: placeDetails.geometry.location.lng(),
                          description: location.description
                        };
                        setFromLocationData(coords);
                      }
                    } catch (error) {
                      console.error('Error getting coordinates:', error);
                    }
                  }
                }}
                placeholder="Departure"
                icon={<Search className="w-4 h-4 text-primary" />}
                className="pl-12 h-12 border border-gray-200 bg-white text-sm sm:text-base font-medium rounded-xl hover:border-gray-300 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-blue-500 shadow-none"
                showGetLocation={true}
              />
            </div>

            {/* To Field */}
            <div className="mb-3.5 relative group">
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">To</label>
              <LocationAutocomplete
                value={toLocation}
                onChange={setToLocation}
                onLocationSelect={async (location) => {
                  setToLocation(location.description);

                  if (location.place_id === 'current_location' && 'lat' in location && 'lng' in location) {
                    const coords = {
                      lat: (location as any).lat,
                      lng: (location as any).lng,
                      description: location.description
                    };
                    setToLocationData(coords);
                  } else {
                    try {
                      const placeDetails = await googleMapsService.getPlaceDetails(location.place_id);
                      if (placeDetails && placeDetails.geometry && placeDetails.geometry.location) {
                        const coords = {
                          lat: placeDetails.geometry.location.lat(),
                          lng: placeDetails.geometry.location.lng(),
                          description: location.description
                        };
                        setToLocationData(coords);
                      }
                    } catch (error) {
                      console.error('Error getting coordinates:', error);
                    }
                  }
                }}
                placeholder="Destination"
                icon={<MapPin className="w-4 h-4 text-primary" />}
                className="pl-12 h-12 border border-gray-200 bg-white text-sm sm:text-base font-medium rounded-xl hover:border-gray-300 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-blue-500 shadow-none"
              />
            </div>

            {/* Date and Time Row */}
            <div className="grid grid-cols-2 gap-3 mb-3.5">
              {/* Date of Journey */}
              <div className="group">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">Pickup Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                    min={getDefaultDate(0)}
                    className="pl-9 h-11 border border-gray-200 rounded-xl hover:border-gray-300 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-blue-500 cursor-pointer text-xs sm:text-sm font-medium shadow-none"
                  />
                </div>
              </div>

              {/* Pickup Time */}
              <div className="group">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">Pickup Time</label>
                <div className="relative">
                  <Input
                    type="time"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                    className="pl-3 h-11 border border-gray-200 rounded-xl hover:border-gray-300 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-blue-500 cursor-pointer text-xs sm:text-sm font-medium shadow-none"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Search Button */}
          <Button
            className="w-full h-12 sm:h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md font-bold text-sm sm:text-base transition-all duration-200 active:scale-[0.99]"
            onClick={handleSearch}
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Search Vehicles
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

