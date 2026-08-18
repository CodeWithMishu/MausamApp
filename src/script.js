const API_KEY = import.meta.env.VITE_API_KEY;

const cityInput = document.getElementById('location');
const searchBtn = document.getElementById('search');
const currentWeatherSection = document.getElementById('current-weather');
const otherInfoSection = document.querySelector('.other-info');
const loader = document.getElementById('loader');
const errorMessage = document.getElementById('error-message');

const currentCityElement = document.getElementById('city');
const currentDateElement = document.getElementById('date');
const weatherIconElement = document.getElementById('weather-icon');
const temperatureElement = document.querySelector('.temperature');
const weatherDescriptionElement = document.getElementById('weather-description');

const feelsLikeElement = document.getElementById('feels-like-value');
const humidityElement = document.getElementById('humidity-value');
const windElement = document.getElementById('wind-value');

const forecastContainer = document.getElementById('forecast-weekdays');

const sunriseTimeElement = document.getElementById('sunrise-time');
const sunsetTimeElement = document.getElementById('sunset-time');
const pressureValueElement = document.getElementById('pressure-value');
const visibilityValueElement = document.getElementById('visibility-value');

const currentLocationBtn = document.getElementById('current-location-btn');

const themeToggleButton = document.getElementById('theme-toggle-btn');
const themeIcon = document.getElementById('theme-icon');

function showLoader() {
  loader.classList.add('active');
  errorMessage.classList.remove('active');
}

function hideLoader() {
  loader.classList.remove('active');
}

function showError(message) {
  hideLoader();
  errorMessage.textContent = message;
  errorMessage.classList.add('active');
}

function hideError() {
  errorMessage.classList.remove('active');
  errorMessage.textContent = '';
}

function getCityInput() {
  const city = cityInput.value.trim();
  if (!city) {
    showError('Please enter a city name.');
    return;
  }
  localStorage.setItem('city', city);
  showLoader();
  hideError();
  fetchLocation(city);
}

async function fetchLocation(city) {
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }
    const result = await response.json();

    if (result.length === 0) {
      showError(`City "${city}" not found. Please try again.`);
      return;
    }

    const { lat, lon } = result[0];
    localStorage.setItem('lat', lat);
    localStorage.setItem('lon', lon);

    await Promise.all([
      fetchWeather(lat, lon, city),
      fetchForecast(lat, lon),
    ]);

    currentWeatherSection.classList.remove('hidden');
    otherInfoSection.classList.remove('hidden');
    hideLoader();
  } catch (error) {
    showError('Failed to fetch weather data. Please check your connection.');
    console.error(error);
  }
}

async function fetchWeather(lat, lon, originalCity) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Weather fetch failed: ${response.status}`);
    }
    const data = await response.json();
    updateCurrentWeatherUI(data, originalCity);
  } catch (error) {
    showError('Failed to load current weather.');
    console.error(error);
  }
}

async function fetchForecast(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Forecast fetch failed: ${response.status}`);
    }
    const data = await response.json();
    const dailyForecasts = data.list.filter((item) =>
      item.dt_txt.includes('12:00:00')
    );
    updateForecastUI(dailyForecasts);
  } catch (error) {
    console.error(error);
  }
}

function updateForecastUI(dailyData) {
  forecastContainer.innerHTML = '';

  dailyData.forEach((day) => {
    const { dt, main, weather } = day;
    const date = new Date(dt * 1000);

    const dayCard = document.createElement('div');
    dayCard.classList.add('days');
    dayCard.innerHTML = `
      <img src="https://openweathermap.org/img/wn/${weather[0].icon}.png" alt="${weather[0].description}" />
      <span class="day-name">${date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
      <span class="day-date">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      <span class="day-temp">${Math.round(main.temp)}°c</span>
      <span class="day-condition">${weather[0].main}</span>
    `;
    forecastContainer.appendChild(dayCard);
  });
}

function updateCurrentWeatherUI(data, cityName) {
  const { dt, main, weather, wind, sys, visibility } = data;

  currentCityElement.textContent =
    cityName.charAt(0).toUpperCase() + cityName.slice(1);
  currentDateElement.textContent = new Date(dt * 1000).toLocaleDateString(
    'en-US',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  );

  weatherIconElement.src = `https://openweathermap.org/img/wn/${weather[0].icon}@4x.png`;
  weatherIconElement.alt = weather[0].description;
  temperatureElement.textContent = `${Math.round(main.temp)}°c`;
  weatherDescriptionElement.textContent = weather[0].description
    .replace(/\b\w/g, (c) => c.toUpperCase());

  feelsLikeElement.textContent = `${Math.round(main.feels_like)}°c`;
  humidityElement.textContent = `${main.humidity}%`;
  windElement.textContent = `${wind.speed} m/s`;

  const sunrise = new Date(sys.sunrise * 1000);
  const sunset = new Date(sys.sunset * 1000);
  sunriseTimeElement.textContent = sunrise.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  sunsetTimeElement.textContent = sunset.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  pressureValueElement.textContent = `${main.pressure} hPa`;
  visibilityValueElement.textContent = `${(visibility / 1000).toFixed(1)} km`;
}

function getCurrentLocation() {
  if (!navigator.geolocation) {
    showError('Geolocation is not supported by your browser.');
    return;
  }
  showLoader();
  hideError();
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude: lat, longitude: lon } = position.coords;
      localStorage.setItem('lat', lat);
      localStorage.setItem('lon', lon);
      try {
        const city = await reverseGeocode(lat, lon);
        localStorage.setItem('city', city);
        cityInput.value = city;
        await Promise.all([fetchWeather(lat, lon, city), fetchForecast(lat, lon)]);
        currentWeatherSection.classList.remove('hidden');
        otherInfoSection.classList.remove('hidden');
        hideLoader();
      } catch {
        showError('Failed to get location name.');
      }
    },
    (error) => {
      if (error.code === error.PERMISSION_DENIED) {
        showError('Location access denied. Please allow location permissions.');
      } else {
        showError('Unable to get your location. Try searching instead.');
      }
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
  );
}

async function reverseGeocode(lat, lon) {
  const url = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Reverse geocoding failed');
  const result = await response.json();
  if (result.length === 0) throw new Error('No city found for coordinates');
  return result[0].city || result[0].name || 'Unknown Location';
}

function toggleTheme() {
  const isDarkMode = document.body.classList.toggle('dark-mode');
  localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  updateThemeIcon(isDarkMode);
}

function updateThemeIcon(isDarkMode) {
  if (isDarkMode) {
    themeIcon.src = 'Assets/theme-light.svg';
    themeIcon.alt = 'Switch to light mode';
  } else {
    themeIcon.src = 'Assets/theme-light.svg';
    themeIcon.alt = 'Switch to dark mode';
  }
}

export function initApp() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  const isDarkMode = savedTheme === 'dark';
  document.body.classList.toggle('dark-mode', isDarkMode);
  updateThemeIcon(isDarkMode);

  searchBtn.addEventListener('click', getCityInput);
  cityInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') getCityInput();
  });

  themeToggleButton.addEventListener('click', toggleTheme);
  currentLocationBtn.addEventListener('click', getCurrentLocation);

  const lastCity = localStorage.getItem('city');
  if (lastCity) {
    cityInput.value = lastCity;
    showLoader();
    fetchLocation(lastCity);
  }
}
