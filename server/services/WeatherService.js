// Lightweight weather helper using Open‑Meteo public APIs (no API key required)
// Node >= 18 provides global fetch

class WeatherService {
  static async geocodeLocation(query) {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.searchParams.set('name', query);
    url.searchParams.set('count', '1');
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
    const data = await res.json();
    const loc = data.results?.[0];
    if (!loc) return null;
    return {
      latitude: loc.latitude,
      longitude: loc.longitude,
      name: loc.name,
      country: loc.country_code || loc.country,
      admin1: loc.admin1 || loc.admin2 || null,
      timezone: loc.timezone || 'auto'
    };
  }

  static async fetchCurrentWeather(lat, lon, timezone = 'auto') {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set('current_weather', 'true');
    url.searchParams.set('hourly', 'temperature_2m,precipitation_probability,relative_humidity_2m');
    url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum');
    url.searchParams.set('timezone', timezone);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Weather fetch failed (${res.status})`);
    return await res.json();
  }

  static formatWeatherReport(location, weather) {
    const place = [location.name, location.admin1, location.country].filter(Boolean).join(', ');
    const current = weather.current_weather || {};
    const temp = current.temperature;
    const wind = current.windspeed;
    const code = current.weathercode;
    const nowSummary = `Now: ${typeof temp === 'number' ? Math.round(temp) + '°C' : 'N/A'}, wind ${typeof wind === 'number' ? Math.round(wind) + ' km/h' : 'N/A'}`;

    const daily = weather.daily || {};
    const tmax = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max[0] : null;
    const tmin = Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min[0] : null;
    const prcp = Array.isArray(daily.precipitation_sum) ? daily.precipitation_sum[0] : null;
    const todaySummary = `Today: high ${tmax !== null ? Math.round(tmax) + '°C' : 'N/A'}, low ${tmin !== null ? Math.round(tmin) + '°C' : 'N/A'}, precip ${prcp !== null ? Math.round(prcp) + ' mm' : 'N/A'}`;

    const lines = [
      `### Weather — ${place}`,
      nowSummary,
      todaySummary
    ];
    return lines.join('\n');
  }

  static extractLocationQuery(prompt) {
    // Try to capture "in <location>" or "for <location>"
    const m = prompt.match(/\b(?:in|for)\s+([^?.!,\n]+)\b/i);
    if (m && m[1]) {
      return m[1].trim();
    }
    return null;
  }

  static async getWeatherForPrompt(prompt) {
    const query = this.extractLocationQuery(prompt);
    if (!query) {
      return {
        needsLocation: true,
        message: 'Which city or ZIP should I check the weather for?'
      };
    }

    const location = await this.geocodeLocation(query);
    if (!location) {
      return {
        error: true,
        message: `I couldn't find a location for "${query}". Please try another city or ZIP.`
      };
    }

    const weather = await this.fetchCurrentWeather(location.latitude, location.longitude, location.timezone);
    const report = this.formatWeatherReport(location, weather);
    return {
      location,
      weather,
      content: report
    };
  }
}

module.exports = WeatherService;


