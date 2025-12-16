/**
 * Geocoding Service
 * Direct calls to Nominatim and IP-API - replaces n8n location-lookup
 */

import { GeocodingResult, IpGeoResult } from '../types';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
const IP_API_URL = 'http://ip-api.com/json';
const USER_AGENT = 'AG-MCP-Chat/1.0 (agriculture-advisor@digitalgreen.org)';

interface NominatimResponse {
  error?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    country?: string;
    state?: string;
    region?: string;
  };
}

interface IpApiResponse {
  status: string;
  message?: string;
  country?: string;
  countryCode?: string;
  regionName?: string;
  city?: string;
  lat?: number;
  lon?: number;
}

/**
 * Reverse geocode coordinates to address using Nominatim
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodingResult | null> {
  try {
    const url = `${NOMINATIM_URL}/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[Geocoding] Nominatim error:', response.status);
      return null;
    }

    const data = (await response.json()) as NominatimResponse;

    if (data.error) {
      console.error('[Geocoding] Nominatim returned error:', data.error);
      return null;
    }

    const address = data.address || {};

    return {
      city: address.city || address.town || address.village || address.county,
      country: address.country,
      region: address.state || address.region,
      latitude,
      longitude,
    };
  } catch (error) {
    console.error('[Geocoding] Reverse geocode error:', (error as Error).message);
    return null;
  }
}

/**
 * Lookup location from IP address using IP-API
 */
export async function lookupIpLocation(ipAddress: string): Promise<IpGeoResult | null> {
  try {
    // Skip for local addresses
    if (ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress.startsWith('192.168.')) {
      return null;
    }

    const url = `${IP_API_URL}/${ipAddress}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[Geocoding] IP-API error:', response.status);
      return null;
    }

    const data = (await response.json()) as IpApiResponse;

    if (data.status !== 'success') {
      console.error('[Geocoding] IP-API returned error:', data.message);
      return null;
    }

    return {
      city: data.city || '',
      country: data.country || '',
      countryCode: data.countryCode || '',
      region: data.regionName || '',
      lat: data.lat || 0,
      lon: data.lon || 0,
    };
  } catch (error) {
    console.error('[Geocoding] IP lookup error:', (error as Error).message);
    return null;
  }
}

/**
 * Combined location lookup - tries coordinates first, then IP
 */
export async function lookupLocation(
  latitude?: number,
  longitude?: number,
  ipAddress?: string
): Promise<{
  success: boolean;
  source: 'coordinates' | 'ip' | 'none';
  level1Country?: string;
  level1CountryCode?: string;
  level2State?: string;
  level5City?: string;
  displayName?: string;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
}> {
  // Try coordinates first
  if (latitude && longitude) {
    const result = await reverseGeocode(latitude, longitude);
    if (result) {
      return {
        success: true,
        source: 'coordinates',
        level1Country: result.country,
        level2State: result.region,
        level5City: result.city,
        displayName: result.city
          ? `${result.city}, ${result.country}`
          : result.country,
        formattedAddress: [result.city, result.region, result.country]
          .filter(Boolean)
          .join(', '),
        latitude,
        longitude,
      };
    }
  }

  // Try IP address
  if (ipAddress) {
    const result = await lookupIpLocation(ipAddress);
    if (result) {
      return {
        success: true,
        source: 'ip',
        level1Country: result.country,
        level1CountryCode: result.countryCode,
        level2State: result.region,
        level5City: result.city,
        displayName: result.city
          ? `${result.city}, ${result.country}`
          : result.country,
        formattedAddress: [result.city, result.region, result.country]
          .filter(Boolean)
          .join(', '),
        latitude: result.lat,
        longitude: result.lon,
      };
    }
  }

  return {
    success: false,
    source: 'none',
  };
}
