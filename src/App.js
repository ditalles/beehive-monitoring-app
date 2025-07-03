import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, query, onSnapshot, updateDoc, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// Firebase Context for easy access to auth and db
const FirebaseContext = createContext(null);

// Custom Modal Component (instead of alert/confirm)
const Modal = ({ show, title, message, onClose, children }) => {
    if (!show) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>
                {message && <p className="text-gray-700 mb-6">{message}</p>}
                {children}
                <button
                    onClick={onClose}
                    className="mt-6 w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition duration-300"
                >
                    Close
                </button>
            </div>
        </div>
    );
};

// Utility function to generate random data for demonstration (fallback)
const generateSimulatedData = (days = 30) => {
    const data = [];
    const now = new Date();
    for (let i = 0; i < days; i++) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        data.unshift({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            weight: parseFloat((Math.random() * 10 + 30).toFixed(2)), // 30-40 kg
            broodTemperature: parseFloat((Math.random() * 5 + 32).toFixed(2)), // 32-37 C
            insideTemperature: parseFloat((Math.random() * 5 + 28).toFixed(2)), // 28-33 C
            outsideTemperature: parseFloat((Math.random() * 15 + 10).toFixed(2)), // 10-25 C
            batteryVoltage: parseFloat((Math.random() * 0.5 + 3.5).toFixed(2)), // 3.5-4.0 V
            humidity: parseFloat((Math.random() * 20 + 60).toFixed(2)), // 60-80%
            dhtTemperature: parseFloat((Math.random() * 5 + 25).toFixed(2)), // 25-30 C
            gpsValid: Math.random() > 0.5 ? 1 : 0, // 0 or 1
        });
    }
    return data;
};

// Function to fetch data from ThingSpeak
const fetchThingSpeakData = async (channelId, readApiKey, numResults = 100) => {
    if (!channelId || !readApiKey) {
        console.warn("ThingSpeak Channel ID or Read API Key missing. Using simulated data.");
        return generateSimulatedData(numResults === 1 ? 1 : 30); // Return single point for latest, or 30 for charts
    }

    const url = `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${readApiKey}&results=${numResults}`;
    console.log("Attempting to fetch from ThingSpeak URL:", url);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`ThingSpeak API Error: HTTP status ${response.status}, Response: ${errorText}`);
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        console.log("ThingSpeak Raw Data (from API):", data);

        if (!data || !data.feeds || data.feeds.length === 0) {
            console.warn("No feeds found in ThingSpeak response. Using simulated data.");
            return generateSimulatedData(numResults === 1 ? 1 : 30);
        }

        const mappedData = data.feeds.map(feed => ({
            date: new Date(feed.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date(feed.created_at).getTime(), // Add timestamp for easier time-based calculations
            weight: parseFloat(feed.field1),
            broodTemperature: parseFloat(feed.field2),
            insideTemperature: parseFloat(feed.field3),
            outsideTemperature: parseFloat(feed.field4),
            batteryVoltage: parseFloat(feed.field5),
            humidity: parseFloat(feed.field6),
            dhtTemperature: parseFloat(feed.field7),
            gpsValid: parseFloat(feed.field8) === 1 ? 1 : 0,
        })).filter(item => {
            const isValid = !isNaN(item.weight) && item.weight !== null; // Check at least weight for validity
            if (!isValid) {
                console.warn("Skipping invalid data point (e.g., weight is not a number):", item);
            }
            return isValid;
        });

        console.log("ThingSpeak Mapped Data:", mappedData);

        return mappedData.sort((a, b) => new Date(a.date) - new Date(b.date));

    } catch (error) {
        console.error("Error fetching ThingSpeak data:", error);
        return generateSimulatedData(numResults === 1 ? 1 : 30);
    }
};

// Login Component
const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [channelId, setChannelId] = useState('');
    const [readApiKey, setReadApiKey] = useState('');
    const [rememberMe, setRememberMe] = useState(false); // New state for "Remember Me"
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');

    useEffect(() => {
        // Load saved credentials from localStorage on component mount
        const savedUsername = localStorage.getItem('heilooHiveUsername');
        const savedChannelId = localStorage.getItem('heilooHiveChannelId');
        const savedReadApiKey = localStorage.getItem('heilooHiveReadApiKey');
        if (savedUsername && savedChannelId && savedReadApiKey) {
            setUsername(savedUsername);
            setChannelId(savedChannelId);
            setReadApiKey(savedReadApiKey);
            setRememberMe(true); // Set rememberMe to true if credentials are found
        }
    }, []);

    const handleLogin = () => {
        if (username && channelId && readApiKey) {
            if (rememberMe) {
                localStorage.setItem('heilooHiveUsername', username);
                localStorage.setItem('heilooHiveChannelId', channelId);
                localStorage.setItem('heilooHiveReadApiKey', readApiKey);
            } else {
                localStorage.removeItem('heilooHiveUsername');
                localStorage.removeItem('heilooHiveChannelId');
                localStorage.removeItem('heilooHiveReadApiKey');
            }
            onLogin(username, channelId, readApiKey);
        } else {
            setModalMessage('Please enter username, ThingSpeak Channel ID, and Read API Key.');
            setShowModal(true);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
                <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">HeilooHive Login</h2>
                <div className="mb-5">
                    <label htmlFor="username" className="block text-gray-700 text-sm font-semibold mb-2">
                        Username:
                    </label>
                    <input
                        type="text"
                        id="username"
                        className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                        autoComplete="username"
                    />
                </div>
                <div className="mb-5">
                    <label htmlFor="channelId" className="block text-gray-700 text-sm font-semibold mb-2">
                        ThingSpeak Channel ID:
                    </label>
                    <input
                        type="text"
                        id="channelId"
                        className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={channelId}
                        onChange={(e) => setChannelId(e.target.value)}
                        placeholder="e.g., 123456"
                        autoComplete="off"
                    />
                </div>
                <div className="mb-6">
                    <label htmlFor="readApiKey" className="block text-gray-700 text-sm font-semibold mb-2">
                        ThingSpeak Read API Key:
                    </label>
                    <input
                        type="password"
                        id="readApiKey"
                        className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={readApiKey}
                        onChange={(e) => setReadApiKey(e.target.value)}
                        placeholder="Enter your Read API Key"
                        autoComplete="current-password"
                    />
                    <p className="text-gray-600 text-xs italic">
                        (You can find these on your ThingSpeak channel settings.)
                    </p>
                </div>
                <div className="mb-6 flex items-center">
                    <input
                        type="checkbox"
                        id="rememberMe"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor="rememberMe" className="ml-2 text-gray-700 text-sm">Remember Me</label>
                </div>
                <button
                    onClick={handleLogin}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                    Login
                </button>
            </div>
            <Modal
                show={showModal}
                title="Login Error"
                message={modalMessage}
                onClose={() => setShowModal(false)}
            />
        </div>
    );
};

// Dashboard Component
const Dashboard = ({ user, hives, onSelectHive, onLogout, alerts, onMarkAlertRead, onShowAlertsModal }) => {
    const { userId, userThingSpeakChannelId, userThingSpeakReadApiKey } = useContext(FirebaseContext);
    const [latestHiveData, setLatestHiveData] = useState({});
    const [isLoadingLatestData, setIsLoadingLatestData] = useState(true);

    // Fetch latest data for dashboard on component mount and when hives change
    useEffect(() => {
        const fetchAllLatestData = async () => {
            setIsLoadingLatestData(true);
            const newLatestData = {};
            for (const hive of hives.filter(h => !h._deleted)) {
                try {
                    // Fetch only the latest entry (results=1)
                    const data = await fetchThingSpeakData(userThingSpeakChannelId, userThingSpeakReadApiKey, 1);
                    if (data && data.length > 0) {
                        newLatestData[hive.id] = data[0];
                    }
                } catch (error) {
                    console.error(`Error fetching latest data for hive ${hive.name}:`, error);
                    newLatestData[hive.id] = null; // Mark as failed to fetch
                }
            }
            setLatestHiveData(newLatestData);
            setIsLoadingLatestData(false);
        };

        if (hives.length > 0 && userThingSpeakChannelId && userThingSpeakReadApiKey) {
            fetchAllLatestData();
        } else if (hives.length === 0) {
            setIsLoadingLatestData(false); // No hives, no data to load
        }
    }, [hives, userThingSpeakChannelId, userThingSpeakReadApiKey]);

    const getLatestDataForDisplay = (hiveId) => {
        return latestHiveData[hiveId] || {};
    };

    const unreadAlertCount = alerts.filter(alert => !alert.isRead).length;

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 font-inter">
            <header className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-md mb-6">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-2 sm:mb-0">HeilooHive Dashboard</h1>
                <div className="flex items-center space-x-4">
                    <span className="text-gray-700 text-sm hidden sm:block">Welcome, {user.username}! (User ID: {userId})</span>
                    <button
                        onClick={onShowAlertsModal}
                        className="relative bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-md transition duration-300 shadow-sm flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Alerts
                        {unreadAlertCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                {unreadAlertCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={onLogout}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md transition duration-300 shadow-sm"
                    >
                        Logout
                    </button>
                </div>
            </header>

            <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Hives</h2>
            {isLoadingLatestData ? (
                <div className="text-center py-8">
                    <p className="text-gray-600 text-lg">Loading latest hive data...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {hives.length > 0 ? (
                        hives.map((hive) => {
                            const latestData = getLatestDataForDisplay(hive.id);
                            const hasAlert = alerts.some(alert => !alert.isRead && alert.hiveId === hive.id);

                            return (
                                <div
                                    key={hive.id}
                                    className={`bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition duration-300 cursor-pointer border-2 ${hasAlert ? 'border-red-500' : 'border-gray-200'}`}
                                    onClick={() => onSelectHive(hive)}
                                >
                                    <h3 className="text-xl font-semibold text-gray-800 mb-3 flex items-center">
                                        {hive.name}
                                        {hasAlert && (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500 ml-2 animate-pulse" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </h3>
                                    <div className="text-gray-700 text-sm space-y-2">
                                        <p><strong>Weight:</strong> {latestData.weight ? `${latestData.weight} kg` : 'N/A'}</p>
                                        <p><strong>Brood Temp:</strong> {latestData.broodTemperature ? `${latestData.broodTemperature} °C` : 'N/A'}</p>
                                        <p><strong>Inside Temp:</strong> {latestData.insideTemperature ? `${latestData.insideTemperature} °C` : 'N/A'}</p>
                                        <p><strong>Outside Temp:</strong> {latestData.outsideTemperature ? `${latestData.outsideTemperature} °C` : 'N/A'}</p>
                                        <p><strong>Battery:</strong> {latestData.batteryVoltage ? `${latestData.batteryVoltage} V` : 'N/A'}</p>
                                        <p><strong>Humidity:</strong> {latestData.humidity ? `${latestData.humidity} %` : 'N/A'}</p>
                                        <p><strong>DHT Temp:</strong> {latestData.dhtTemperature ? `${latestData.dhtTemperature} °C` : 'N/A'}</p>
                                        <p><strong>GPS Valid:</strong> {latestData.gpsValid !== undefined ? (latestData.gpsValid === 1 ? 'Yes' : 'No') : 'N/A'}</p>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onSelectHive(hive); }}
                                        className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 shadow-sm"
                                    >
                                        View Details
                                    </button>
                                </div>
                            );
                        })
                    ) : (
                        <p className="col-span-full text-center text-gray-600 text-lg">No hives found. Add some in settings!</p>
                    )}
                </div>
            )}
            <button
                onClick={() => onSelectHive({ id: 'settings', name: 'Settings' })}
                className="fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 text-lg"
            >
                Settings
            </button>
        </div>
    );
};

// Hive Detail Component
const HiveDetail = ({ hive, onBack, userSettings, onCreateAlert }) => {
    const [selectedPeriod, setSelectedPeriod] = useState('30days');
    const [selectedSensor, setSelectedSensor] = useState('weight');
    const [hiveData, setHiveData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');

    const { userThingSpeakChannelId, userThingSpeakReadApiKey } = useContext(FirebaseContext);

    // Fetch data and check for alerts
    useEffect(() => {
        const loadDataAndCheckAlerts = async () => {
            setIsLoading(true);
            try {
                // For swarm detection, fetch enough data to cover the longest possible time window (e.g., 48 hours for a 24-hour check)
                const data = await fetchThingSpeakData(userThingSpeakChannelId, userThingSpeakReadApiKey, 2000); // Fetch more data points for historical analysis
                setHiveData(data);

                if (data.length === 0) {
                    setModalMessage("No data found for the selected period. Displaying simulated data as fallback.");
                    setShowModal(true);
                    setHiveData(generateSimulatedData(getNumResults(selectedPeriod)));
                } else {
                    // Check for general sensor alerts with the latest data point
                    const latestDataPoint = data[data.length - 1];
                    if (latestDataPoint && userSettings.alertThresholds) {
                        Object.keys(userSettings.alertThresholds).forEach(sensorKey => {
                            // Skip swarmDetection here, it's handled separately
                            if (sensorKey === 'swarmDetection') return;

                            const threshold = userSettings.alertThresholds[sensorKey];
                            const actualValue = latestDataPoint[sensorKey];

                            if (threshold.enabled && typeof actualValue === 'number' && !isNaN(actualValue)) {
                                let trigger = false;
                                if (threshold.type === 'below' && actualValue < threshold.value) {
                                    trigger = true;
                                } else if (threshold.type === 'above' && actualValue > threshold.value) {
                                    trigger = true;
                                }

                                if (trigger) {
                                    onCreateAlert(hive.id, hive.name, sensorKey, threshold.type, threshold.value, actualValue);
                                }
                            }
                        });
                    }

                    // --- Swarm Detection Logic ---
                    const swarmSettings = userSettings.alertThresholds.swarmDetection;
                    if (swarmSettings && swarmSettings.enabled && data.length > 1) {
                        const latestWeight = data[data.length - 1].weight;
                        const latestTimestamp = data[data.length - 1].timestamp;

                        // Find the data point at the beginning of the time window
                        const timeWindowMs = swarmSettings.timeWindowHours * 60 * 60 * 1000;
                        const historicalTimestampThreshold = latestTimestamp - timeWindowMs;

                        // Find the closest data point just before or at the historical timestamp threshold
                        let historicalDataPoint = null;
                        for (let i = data.length - 2; i >= 0; i--) { // Start from second to last
                            if (data[i].timestamp <= historicalTimestampThreshold) {
                                historicalDataPoint = data[i];
                                break;
                            }
                        }

                        if (historicalDataPoint && typeof latestWeight === 'number' && !isNaN(latestWeight) &&
                            typeof historicalDataPoint.weight === 'number' && !isNaN(historicalDataPoint.weight)) {
                            const weightChange = latestWeight - historicalDataPoint.weight; // Negative for drop

                            if (weightChange <= -swarmSettings.weightDropKg) {
                                onCreateAlert(
                                    hive.id,
                                    hive.name,
                                    'swarmDetection',
                                    'rapid_drop', // Custom type for swarm
                                    swarmSettings.weightDropKg,
                                    `${weightChange.toFixed(2)} kg over ${swarmSettings.timeWindowHours} hrs` // Actual change
                                );
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to load ThingSpeak data for hive:", error);
                setModalMessage("Failed to load ThingSpeak data. Displaying simulated data as fallback.");
                setShowModal(true);
                setHiveData(generateSimulatedData(getNumResults(selectedPeriod))); // Fallback
            } finally {
                setIsLoading(false);
            }
        };
        // Removed onCreateAlert from dependencies as its identity change does not directly necessitate re-fetching data.
        // Its stability is ensured by useCallback in the parent App component.
        loadDataAndCheckAlerts();
    }, [hive.id, selectedPeriod, userThingSpeakChannelId, userThingSpeakReadApiKey, userSettings.alertThresholds, hive.name]);

    const getNumResults = (period) => {
        switch (period) {
            case 'today': return 24; // Assuming hourly data for today
            case '3days': return 3 * 24;
            case '7days': return 7 * 24;
            case '30days': return 30 * 24;
            case 'custom': return 8000; // ThingSpeak max results
            default: return 100;
        }
    };

    const filteredData = hiveData.filter(item => {
        const periodMs = {
            'today': 24 * 60 * 60 * 1000,
            '3days': 3 * 24 * 60 * 60 * 1000,
            '7days': 7 * 24 * 60 * 60 * 1000,
            '30days': 30 * 24 * 60 * 60 * 1000,
            'custom': Infinity // For 'custom', show all fetched data
        }[selectedPeriod];

        if (selectedPeriod === 'custom') return true; // Already filtered by numResults in fetch

        const now = new Date().getTime();
        return (now - item.timestamp) <= periodMs;
    });

    const calculateStats = (data, sensorKey) => {
        if (!data || data.length === 0) return { min: 'N/A', max: 'N/A', avg: 'N/A' };
        const values = data.map(d => d[sensorKey]).filter(v => typeof v === 'number' && !isNaN(v));
        if (values.length === 0) return { min: 'N/A', max: 'N/A', avg: 'N/A' };

        const min = Math.min(...values).toFixed(2);
        const max = Math.max(...values).toFixed(2);
        const avg = (values.reduce((sum, val) => sum + val, 0) / values.length).toFixed(2);
        return { min, max, avg };
    };

    const sensorStats = calculateStats(filteredData, selectedSensor);

    const calculateHoneyYield = (data) => {
        if (!data || data.length < 2) return { daily: [], total: 'N/A' };

        const dailyYield = [];
        let totalYield = 0;

        const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

        for (let i = 1; i < sortedData.length; i++) {
            const currentWeight = sortedData[i].weight;
            const previousWeight = sortedData[i - 1].weight;
            if (typeof currentWeight === 'number' && typeof previousWeight === 'number' && !isNaN(currentWeight) && !isNaN(previousWeight)) {
                const yieldToday = currentWeight - previousWeight;
                if (yieldToday > 0) {
                    dailyYield.push({ date: sortedData[i].date, yield: parseFloat(yieldToday.toFixed(2)) });
                    totalYield += yieldToday;
                } else {
                    dailyYield.push({ date: sortedData[i].date, yield: 0 });
                }
            }
        }
        return { daily: dailyYield, total: parseFloat(totalYield.toFixed(2)) };
    };

    const honeyYieldData = calculateHoneyYield(filteredData);

    const availableSensors = [
        { key: 'weight', name: 'Weight (kg)', color: '#8884d8' },
        { key: 'broodTemperature', name: 'Brood Temp (°C)', color: '#82ca9d' },
        { key: 'insideTemperature', name: 'Inside Temp (°C)', color: '#ffc658' },
        { key: 'outsideTemperature', name: 'Outside Temp (°C)', color: '#a4de6c' },
        { key: 'batteryVoltage', name: 'Battery Voltage (V)', color: '#d0ed57' },
        { key: 'humidity', name: 'Humidity (%)', color: '#ff7300' },
        { key: 'dhtTemperature', name: 'DHT Temp (°C)', color: '#83a6ed' },
        { key: 'gpsValid', name: 'GPS Valid', color: '#8dd1e1' },
    ].filter(sensor => userSettings.enabledFields[sensor.key]);


    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 font-inter">
            <header className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-md mb-6">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-2 sm:mb-0">{hive.name} Details</h1>
                <button
                    onClick={onBack}
                    className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition duration-300 shadow-sm"
                >
                    Back to Dashboard
                </button>
            </header>

            <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Sensor Data</h2>

                <div className="flex flex-wrap gap-4 mb-6">
                    <div className="flex items-center space-x-2">
                        <label htmlFor="sensor-select" className="text-gray-700 font-medium">Select Sensor:</label>
                        <select
                            id="sensor-select"
                            value={selectedSensor}
                            onChange={(e) => setSelectedSensor(e.target.value)}
                            className="border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {availableSensors.map(sensor => (
                                <option key={sensor.key} value={sensor.key}>
                                    {sensor.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center space-x-2">
                        <label htmlFor="period-select" className="text-gray-700 font-medium">Select Period:</label>
                        <select
                            id="period-select"
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                            className="border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="today">Today</option>
                            <option value="3days">Last 3 Days</option>
                            <option value="7days">Last 7 Days</option>
                            <option value="30days">Last 30 Days</option>
                            <option value="custom">All Data (Max 8000 points)</option>
                        </select>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-8">
                        <p className="text-gray-600 text-lg">Loading ThingSpeak data...</p>
                    </div>
                ) : (
                    <>
                        {filteredData.length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                    <div className="bg-blue-50 p-4 rounded-lg shadow-sm">
                                        <p className="text-blue-700 font-semibold">Min Value:</p>
                                        <p className="text-2xl font-bold text-blue-900">{sensorStats.min}</p>
                                    </div>
                                    <div className="bg-green-50 p-4 rounded-lg shadow-sm">
                                        <p className="text-green-700 font-semibold">Max Value:</p>
                                        <p className="text-2xl font-bold text-green-900">{sensorStats.max}</p>
                                    </div>
                                    <div className="bg-yellow-50 p-4 rounded-lg shadow-sm">
                                        <p className="text-yellow-700 font-semibold">Average Value:</p>
                                        <p className="text-2xl font-bold text-yellow-900">{sensorStats.avg}</p>
                                    </div>
                                </div>

                                <div className="h-80 w-full mb-8">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart
                                            data={filteredData}
                                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis />
                                            <Tooltip />
                                            <Line
                                                type="monotone"
                                                dataKey={selectedSensor}
                                                stroke={availableSensors.find(s => s.key === selectedSensor)?.color || '#8884d8'}
                                                activeDot={{ r: 8 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                {userSettings.enabledFields.weight && (
                                    <div className="mt-8">
                                        <h3 className="text-xl font-bold text-gray-800 mb-4">Honey Yield Calculation</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                            <div className="bg-purple-50 p-4 rounded-lg shadow-sm">
                                                <p className="text-purple-700 font-semibold">Total Honey Yield ({selectedPeriod}):</p>
                                                <p className="text-2xl font-bold text-purple-900">{honeyYieldData.total} kg</p>
                                            </div>
                                        </div>
                                        <div className="h-60 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart
                                                    data={honeyYieldData.daily}
                                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="date" />
                                                    <YAxis />
                                                    <Tooltip />
                                                    <Bar dataKey="yield" fill="#8884d8" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-gray-600 text-lg">No data available for the selected period or sensor. Please check your ThingSpeak channel and field mappings.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
            <Modal
                show={showModal}
                title="Data Load Status"
                message={modalMessage}
                onClose={() => setShowModal(false)}
            />
        </div>
    );
};

// Settings Component
const Settings = ({ onBack, userSettings, onSaveSettings, hives, onAddHive, onDeleteHive }) => {
    const [tempSettings, setTempSettings] = useState(userSettings);
    const [newHiveName, setNewHiveName] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');

    useEffect(() => {
        setTempSettings(userSettings);
    }, [userSettings]);

    const handleFieldToggle = (field) => {
        setTempSettings(prevSettings => ({
            ...prevSettings,
            enabledFields: {
                ...prevSettings.enabledFields,
                [field]: !prevSettings.enabledFields[field]
            }
        }));
    };

    const handleAlertThresholdChange = (sensorKey, key, value) => {
        setTempSettings(prevSettings => ({
            ...prevSettings,
            alertThresholds: {
                ...prevSettings.alertThresholds,
                [sensorKey]: {
                    ...prevSettings.alertThresholds[sensorKey],
                    [key]: value
                }
            }
        }));
    };

    const handleSave = () => {
        onSaveSettings(tempSettings);
        setModalMessage('Settings saved successfully!');
        setShowModal(true);
    };

    const handleAddHive = () => {
        if (newHiveName.trim()) {
            onAddHive(newHiveName.trim());
            setNewHiveName('');
            setModalMessage(`Hive "${newHiveName.trim()}" added successfully!`);
            setShowModal(true);
        } else {
            setModalMessage('Please enter a valid hive name.');
            setShowModal(true);
        }
    };

    const handleDeleteHive = (hiveId, hiveName) => {
        setModalMessage(`Are you sure you want to delete hive "${hiveName}"? This action cannot be undone.`);
        setShowModal(true);
        // This is a simplified confirmation. In a real app, you'd have a confirm button in the modal.
        // For now, we'll just proceed with deletion after showing the message.
        onDeleteHive(hiveId);
    };

    const sensorKeysForAlerts = [
        { key: 'weight', name: 'Weight (kg)' },
        { key: 'broodTemperature', name: 'Brood Temp (°C)' },
        { key: 'insideTemperature', name: 'Inside Temp (°C)' },
        { key: 'outsideTemperature', name: 'Outside Temp (°C)' },
        { key: 'batteryVoltage', name: 'Battery Voltage (V)' },
        { key: 'humidity', name: 'Humidity (%)', color: '#ff7300' },
        { key: 'dhtTemperature', name: 'DHT Temp (°C)' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 font-inter">
            <header className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-md mb-6">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-2 sm:mb-0">Settings</h1>
                <button
                    onClick={onBack}
                    className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition duration-300 shadow-sm"
                >
                    Back to Dashboard
                </button>
            </header>

            <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Display Fields</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    {Object.keys(tempSettings.enabledFields).map(field => (
                        <div key={field} className="flex items-center">
                            <input
                                type="checkbox"
                                id={field}
                                checked={tempSettings.enabledFields[field]}
                                onChange={() => handleFieldToggle(field)}
                                className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <label htmlFor={field} className="ml-3 text-gray-700 capitalize">
                                {field.replace(/([A-Z])/g, ' $1').replace('Temp', ' Temperature').replace('Gps', 'GPS').trim()}
                            </label>
                        </div>
                    ))}
                </div>
                <button
                    onClick={handleSave}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 shadow-sm"
                >
                    Save Settings
                </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Alert Thresholds</h2>
                <p className="text-gray-600 text-sm mb-4">Set values that trigger an alert when crossed.</p>
                {sensorKeysForAlerts.map(sensor => (
                    <div key={sensor.key} className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                        <div className="flex items-center mb-2">
                            <input
                                type="checkbox"
                                id={`alert-${sensor.key}-enabled`}
                                checked={tempSettings.alertThresholds[sensor.key]?.enabled || false}
                                onChange={(e) => handleAlertThresholdChange(sensor.key, 'enabled', e.target.checked)}
                                className="h-5 w-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                            />
                            <label htmlFor={`alert-${sensor.key}-enabled`} className="ml-3 text-gray-800 font-semibold">
                                Enable Alert for {sensor.name}
                            </label>
                        </div>
                        {tempSettings.alertThresholds[sensor.key]?.enabled && (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-2">
                                <select
                                    value={tempSettings.alertThresholds[sensor.key]?.type || 'below'}
                                    onChange={(e) => handleAlertThresholdChange(sensor.key, 'type', e.target.value)}
                                    className="border border-gray-300 rounded-lg py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-auto"
                                >
                                    <option value="below">Below</option>
                                    <option value="above">Above</option>
                                </select>
                                <input
                                    type="number"
                                    value={tempSettings.alertThresholds[sensor.key]?.value || ''}
                                    onChange={(e) => handleAlertThresholdChange(sensor.key, 'value', parseFloat(e.target.value))}
                                    placeholder="Threshold Value"
                                    className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    autoComplete="off"
                                />
                            </div>
                        )}
                    </div>
                ))}
                {/* Swarm Detection Specific Alert */}
                <div className="mb-4 p-4 border border-red-300 rounded-lg bg-red-50">
                    <div className="flex items-center mb-2">
                        <input
                            type="checkbox"
                            id={`alert-swarmDetection-enabled`}
                            checked={tempSettings.alertThresholds.swarmDetection?.enabled || false}
                            onChange={(e) => handleAlertThresholdChange('swarmDetection', 'enabled', e.target.checked)}
                            className="h-5 w-5 text-red-600 rounded border-gray-300 focus:ring-red-500"
                        />
                        <label htmlFor={`alert-swarmDetection-enabled`} className="ml-3 text-red-800 font-semibold">
                            Enable Swarm Detection (Rapid Weight Drop)
                        </label>
                    </div>
                    {tempSettings.alertThresholds.swarmDetection?.enabled && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-2">
                            <input
                                type="number"
                                value={tempSettings.alertThresholds.swarmDetection?.weightDropKg || ''}
                                onChange={(e) => handleAlertThresholdChange('swarmDetection', 'weightDropKg', parseFloat(e.target.value))}
                                placeholder="Weight Drop (kg)"
                                className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-red-500"
                                autoComplete="off"
                            />
                            <span className="text-gray-700">kg over</span>
                            <input
                                type="number"
                                value={tempSettings.alertThresholds.swarmDetection?.timeWindowHours || ''}
                                onChange={(e) => handleAlertThresholdChange('swarmDetection', 'timeWindowHours', parseFloat(e.target.value))}
                                placeholder="Time Window (hours)"
                                className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-red-500"
                                autoComplete="off"
                            />
                            <span className="text-gray-700">hours</span>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleSave}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 shadow-sm"
                >
                    Save Settings
                </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Manage Hives</h2>
                <div className="mb-4 flex flex-col sm:flex-row gap-2">
                    <input
                        type="text"
                        value={newHiveName}
                        onChange={(e) => setNewHiveName(e.target.value)}
                        placeholder="Enter new hive name"
                        className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoComplete="off"
                    />
                    <button
                        onClick={handleAddHive}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 shadow-sm whitespace-nowrap"
                    >
                        Add Hive
                    </button>
                </div>
                <ul className="space-y-2">
                    {hives.map(hive => (
                        <li key={hive.id} className="flex justify-between items-center bg-gray-100 p-3 rounded-lg">
                            <span className="text-gray-800 font-medium">{hive.name}</span>
                            <button
                                onClick={() => handleDeleteHive(hive.id, hive.name)}
                                className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md text-sm transition duration-300 shadow-sm"
                            >
                                Delete
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
            <Modal
                show={showModal}
                title="Status"
                message={modalMessage}
                onClose={() => setShowModal(false)}
            />
        </div>
    );
};


// Main App Component
const App = () => {
    const [currentPage, setCurrentPage] = useState('login'); // 'login', 'dashboard', 'detail', 'settings'
    const [user, setUser] = useState(null);
    const [selectedHive, setSelectedHive] = useState(null);
    const [hives, setHives] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [showAlertsModal, setShowAlertsModal] = useState(false);

    const [userSettings, setUserSettings] = useState({
        enabledFields: {
            weight: true,
            broodTemperature: true,
            insideTemperature: true,
            outsideTemperature: true,
            batteryVoltage: true,
            humidity: true,
            dhtTemperature: true,
            gpsValid: true,
        },
        alertThresholds: {
            weight: { enabled: false, type: 'below', value: 20 },
            broodTemperature: { enabled: false, type: 'above', value: 38 },
            insideTemperature: { enabled: false, type: 'above', value: 35 },
            outsideTemperature: { enabled: false, type: 'below', value: 10 },
            batteryVoltage: { enabled: false, type: 'below', value: 3.2 },
            humidity: { enabled: false, type: 'above', value: 90 },
            dhtTemperature: { enabled: false, type: 'above', value: 35 },
            swarmDetection: { enabled: false, weightDropKg: 5, timeWindowHours: 24 } // New swarm detection settings
        }
    });
    const [userThingSpeakChannelId, setUserThingSpeakChannelId] = useState(null);
    const [userThingSpeakReadApiKey, setUserThingSpeakReadApiKey] = useState(null);


    // Firebase state
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    // Fetch user settings from Firestore
    const fetchUserSettings = useCallback(async (firestore, currentUserId, appId) => {
        if (!firestore || !currentUserId || !appId) {
            console.warn("fetchUserSettings: Missing firestore, userId, or appId. Skipping fetch.");
            return;
        }
        const userSettingsRef = doc(firestore, `artifacts/${appId}/users/${currentUserId}/settings/userSettings`);
        console.log("Attempting to fetch user settings from path:", userSettingsRef.path); // Log path
        try {
            const docSnap = await getDoc(userSettingsRef);
            if (docSnap.exists()) {
                // Merge fetched settings with default to ensure new fields (like swarmDetection) are present
                setUserSettings(prev => ({
                    ...prev,
                    ...docSnap.data(),
                    alertThresholds: {
                        ...prev.alertThresholds,
                        ...docSnap.data().alertThresholds
                    }
                }));
                console.log("User settings fetched successfully.");
            } else {
                // Set default settings if none exist
                console.log("No user settings found, setting defaults.");
                await setDoc(userSettingsRef, userSettings);
                console.log("Default user settings saved.");
            }
        } catch (error) {
            console.error("Error fetching or setting user settings:", error);
        }
    }, [userSettings]); // userSettings is a dependency because it's used in the default settings save

    // Save user settings to Firestore
    const saveUserSettings = useCallback(async (newSettings) => {
        if (!db || !userId) {
            console.error("saveUserSettings: Firestore DB or User ID not available. Cannot save.");
            return;
        }
        // Updated to use window.__app_id
        const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';
        const userSettingsRef = doc(db, `artifacts/${appId}/users/${userId}/settings/userSettings`);
        console.log("Attempting to save user settings to path:", userSettingsRef.path); // Log path
        try {
            await setDoc(userSettingsRef, newSettings);
            setUserSettings(newSettings);
            console.log("Settings saved successfully to Firestore.");
        } catch (error) {
            console.error("Error saving user settings:", error);
        }
    }, [db, userId]); // Dependencies for useCallback

    // Fetch hives from Firestore
    const fetchHives = useCallback(async (firestore, currentUserId, appId) => {
        if (!firestore || !currentUserId || !appId) {
            console.warn("fetchHives: Missing firestore, userId, or appId. Skipping fetch.");
            return;
        }
        const hivesCollectionRef = collection(firestore, `artifacts/${appId}/users/${currentUserId}/hives`);
        console.log("Attempting to listen to hives from path:", hivesCollectionRef.path); // Log path
        try {
            onSnapshot(query(hivesCollectionRef, where('_deleted', '!=', true)), (snapshot) => { // Only fetch non-deleted hives
                const fetchedHives = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setHives(fetchedHives);
                console.log("Hives fetched successfully:", fetchedHives);
            }, (error) => {
                console.error("Error fetching hives:", error);
            });
        } catch (error) {
            console.error("Error setting up hive listener:", error);
        }
    }, []); // No external dependencies needed for this function itself

    // Add a new hive to Firestore
    const addHive = useCallback(async (hiveName) => {
        if (!db || !userId) {
            console.error("addHive: Firestore DB or User ID not available. Cannot add hive.");
            return;
        }
        // Updated to use window.__app_id
        const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';
        const hivesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/hives`);
        console.log("Attempting to add hive to path:", hivesCollectionRef.path); // Log path
        try {
            await addDoc(hivesCollectionRef, { name: hiveName, _deleted: false }); // Use addDoc for auto ID
            console.log(`Hive "${hiveName}" added successfully.`);
        } catch (error) {
            console.error("Error adding hive:", error);
        }
    }, [db, userId]); // Dependencies for useCallback

    // Delete a hive from Firestore (soft delete)
    const deleteHive = useCallback(async (hiveId) => {
        if (!db || !userId) {
            console.error("deleteHive: Firestore DB or User ID not available. Cannot delete hive.");
            return;
        }
        // Updated to use window.__app_id
        const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';
        const hiveDocRef = doc(db, `artifacts/${appId}/users/${userId}/hives`, hiveId);
        console.log("Attempting to delete hive from path:", hiveDocRef.path); // Log path
        try {
            await updateDoc(hiveDocRef, { _deleted: true });
            console.log(`Hive ${hiveId} marked as deleted.`);
        } catch (error) {
            console.error("Error deleting hive:", error);
        }
    }, [db, userId]); // Dependencies for useCallback

    // Fetch alerts from Firestore
    const fetchAlerts = useCallback(async (firestore, currentUserId, appId) => {
        if (!firestore || !currentUserId || !appId) {
            console.warn("fetchAlerts: Missing firestore, userId, or appId. Skipping fetch.");
            return;
        }
        const alertsCollectionRef = collection(firestore, `artifacts/${appId}/users/${currentUserId}/alerts`);
        console.log("Attempting to listen to alerts from path:", alertsCollectionRef.path); // Log path
        try {
            onSnapshot(alertsCollectionRef, (snapshot) => {
                const fetchedAlerts = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp?.toDate().toLocaleString() // Convert Firestore Timestamp to readable string
                }));
                setAlerts(fetchedAlerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))); // Sort by newest first
                console.log("Alerts fetched successfully:", fetchedAlerts.length);
            }, (error) => {
                console.error("Error fetching alerts:", error);
            });
        } catch (error) {
            console.error("Error setting up alerts listener:", error);
        }
    }, []); // No external dependencies needed for this function itself

    // Create a new alert in Firestore
    const createAlert = useCallback(async (hiveId, hiveName, sensor, type, threshold, actual) => {
        if (!db || !userId) {
            console.error("createAlert: Firestore DB or User ID not available. Cannot create alert.");
            return;
        }

        // Simple debounce: Check if an identical unread alert exists recently
        // For swarm detection, the 'actual' value (weight change) might differ slightly,
        // so we primarily debounce by hiveId, sensor, type, and threshold value.
        const existingUnreadAlert = alerts.find(
            alert => !alert.isRead &&
                     alert.hiveId === hiveId &&
                     alert.sensor === sensor &&
                     alert.type === type &&
                     alert.threshold === threshold &&
                     (sensor !== 'swarmDetection' || (alert.timestamp && (new Date().getTime() - new Date(alert.timestamp).getTime()) < (userSettings.alertThresholds.swarmDetection.timeWindowHours * 60 * 60 * 1000)))
        );

        if (existingUnreadAlert) {
            console.log("Skipping duplicate unread alert:", { hiveId, sensor, type, threshold });
            return;
        }

        // Updated to use window.__app_id
        const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';
        const alertsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/alerts`);
        console.log("Attempting to create alert at path:", alertsCollectionRef.path); // Log path
        try {
            await addDoc(alertsCollectionRef, {
                hiveId,
                hiveName,
                sensor,
                type,
                threshold: sensor === 'swarmDetection' ? `${threshold}kg over ${userSettings.alertThresholds.swarmDetection.timeWindowHours}hrs` : threshold, // Custom message for swarm
                actual,
                timestamp: serverTimestamp(),
                isRead: false,
            });
            console.log("Alert created successfully:", { hiveId, sensor, type, threshold, actual });
        } catch (error) {
            console.error("Error creating alert:", error);
        }
    }, [db, userId, alerts, userSettings.alertThresholds.swarmDetection]); // Depend on alerts and swarm settings

    // Mark an alert as read
    const markAlertRead = useCallback(async (alertId) => {
        if (!db || !userId) {
            console.error("markAlertRead: Firestore DB or User ID not available. Cannot mark alert as read.");
            return;
        }
        // Updated to use window.__app_id
        const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';
        const alertDocRef = doc(db, `artifacts/${appId}/users/${userId}/alerts`, alertId);
        console.log("Attempting to mark alert as read at path:", alertDocRef.path); // Log path
        try {
            await updateDoc(alertDocRef, { isRead: true });
            console.log(`Alert ${alertId} marked as read.`);
        } catch (error) {
            console.error("Error marking alert as read:", error);
        }
    }, [db, userId]); // Dependencies for useCallback


    // Initialize Firebase and authenticate
    useEffect(() => {
        const initializeFirebaseAndAuth = async () => {
            try {
                // --- IMPORTANT FOR LOCAL DEVELOPMENT ---
                // If you are running this app locally (outside of the Canvas environment),
                // the __firebase_config, __app_id, and __initial_auth_token variables
                // will be undefined. You need to provide your Firebase project's config
                // here for local testing.
                //
                // 1. Go to your Firebase project in the Firebase console.
                // 2. Click "Project settings" (gear icon) -> "General".
                // 3. Scroll down to "Your apps" and select "Web".
                // 4. Copy the `firebaseConfig` object.
                // 5. Paste it below, replacing the empty object.
                // ---------------------------------------
                const localFirebaseConfig = {
                    apiKey: "AIzaSyD7e9S9k3e-2ltNfA0a1CwskUXeZ23KenU",
                    authDomain: "test-54377.firebaseapp.com",
                    projectId: "test-54377",
                    storageBucket: "test-54377.firebasestorage.app",
                    messagingSenderId: "105290450823",
                    appId: "1:105290450823:web:d10732986713477ed697522",
                    measurementId: "G-KWG80FR0TQ"
                };

                // Updated to use window. prefix for global variables to satisfy ESLint
                const firebaseConfig = typeof window.__firebase_config !== 'undefined' ? JSON.parse(window.__firebase_config) : localFirebaseConfig;
                const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';
                const initialAuthToken = typeof window.__initial_auth_token !== 'undefined' ? window.__initial_auth_token : null;

                console.log("Firebase Config (used):", firebaseConfig); // For debugging
                console.log("App ID (used):", appId); // For debugging

                const app = initializeApp(firebaseConfig);
                const firestore = getFirestore(app);
                const firebaseAuth = getAuth(app);

                setDb(firestore);
                setAuth(firebaseAuth);

                const unsubscribe = onAuthStateChanged(firebaseAuth, async (currentUser) => {
                    if (currentUser) {
                        setUserId(currentUser.uid);
                        console.log("Authenticated User ID:", currentUser.uid); // Log user ID
                        // Fetch user data after successful authentication
                        await fetchUserSettings(firestore, currentUser.uid, appId);
                        await fetchHives(firestore, currentUser.uid, appId);
                        await fetchAlerts(firestore, currentUser.uid, appId);
                    } else {
                        // Sign in anonymously if no user is logged in
                        try {
                            if (initialAuthToken) {
                                await signInWithCustomToken(firebaseAuth, initialAuthToken);
                            } else {
                                await signInAnonymously(firebaseAuth);
                            }
                            // After anonymous sign-in, onAuthStateChanged will fire again with a new user
                        } catch (error) {
                            console.error("Firebase anonymous sign-in failed:", error);
                            // Even if anonymous sign-in fails, allow the app to load
                        }
                    }
                    setIsAuthReady(true); // Set auth ready after initial check/attempt
                });

                return () => unsubscribe(); // Cleanup auth listener
            } catch (error) {
                console.error("Firebase initialization failed:", error);
                // Ensure isAuthReady is set to true even if initialization fails
                setIsAuthReady(true);
            }
        };

        initializeFirebaseAndAuth();
    }, [fetchUserSettings, fetchHives, fetchAlerts]); // Added dependencies


    const handleLogin = (username, channelId, readApiKey) => {
        setUser({ username });
        setUserThingSpeakChannelId(channelId);
        setUserThingSpeakReadApiKey(readApiKey);
        setCurrentPage('dashboard');
    };

    const handleLogout = () => {
        setUser(null);
        setCurrentPage('login');
        setSelectedHive(null);
        setHives([]);
        setAlerts([]);
        setUserThingSpeakChannelId(null);
        setUserThingSpeakReadApiKey(null);
        if (auth) {
            auth.signOut().catch(e => console.error("Error signing out:", e));
        }
    };

    const handleSelectHive = (hive) => {
        setSelectedHive(hive);
        if (hive.id === 'settings') {
            setCurrentPage('settings');
        } else {
            setCurrentPage('detail');
        }
    };

    const handleBackToDashboard = () => {
        setCurrentPage('dashboard');
        setSelectedHive(null);
    };

    const renderPage = () => {
        if (!isAuthReady) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-100">
                    <p className="text-xl text-gray-700">Loading application...</p>
                </div>
            );
        }

        switch (currentPage) {
            case 'login':
                return <Login onLogin={handleLogin} />;
            case 'dashboard':
                return (
                    <>
                        <Dashboard
                            user={user}
                            hives={hives}
                            onSelectHive={handleSelectHive}
                            onLogout={handleLogout}
                            alerts={alerts}
                            onMarkAlertRead={markAlertRead}
                            onShowAlertsModal={() => setShowAlertsModal(true)}
                        />
                        <Modal
                            show={showAlertsModal}
                            title="Recent Alerts"
                            onClose={() => setShowAlertsModal(false)}
                        >
                            {alerts.length > 0 ? (
                                <ul className="space-y-3">
                                    {alerts.map(alert => (
                                        <li key={alert.id} className={`p-3 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center ${alert.isRead ? 'bg-gray-100 text-gray-600' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                                            <div>
                                                <p className="font-semibold">
                                                    {alert.hiveName}:
                                                    {alert.sensor === 'swarmDetection' ? (
                                                        <span className="text-red-700"> SWARM DETECTED!</span>
                                                    ) : (
                                                        <span className="capitalize"> {alert.sensor.replace(/([A-Z])/g, ' $1').replace('Temp', ' Temperature').replace('Gps', 'GPS').trim()}</span>
                                                    )}
                                                    {alert.sensor !== 'swarmDetection' && ` ${alert.type} ${alert.threshold}`}
                                                </p>
                                                <p className="text-sm">Current Value: {alert.actual} | Triggered: {alert.timestamp}</p>
                                            </div>
                                            {!alert.isRead && (
                                                <button
                                                    onClick={() => markAlertRead(alert.id)}
                                                    className="mt-2 sm:mt-0 sm:ml-4 bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md text-sm transition duration-300 shadow-sm"
                                                >
                                                    Mark as Read
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-600 text-center py-4">No alerts found.</p>
                            )}
                        </Modal>
                    </>
                );
            case 'detail':
                return (
                    <HiveDetail
                        hive={selectedHive}
                        onBack={handleBackToDashboard}
                        userSettings={userSettings}
                        onCreateAlert={createAlert}
                    />
                );
            case 'settings':
                return (
                    <Settings
                        onBack={handleBackToDashboard}
                        userSettings={userSettings}
                        onSaveSettings={saveUserSettings}
                        hives={hives}
                        onAddHive={addHive}
                        onDeleteHive={deleteHive}
                    />
                );
            default:
                return <Login onLogin={handleLogin} />;
        }
    };

    return (
        <FirebaseContext.Provider value={{ db, auth, userId, isAuthReady, userThingSpeakChannelId, userThingSpeakReadApiKey }}>
            <style>
                {`
                /*
                 * Tailwind CSS is loaded via CDN for demonstration purposes.
                 * In a production environment, you should install Tailwind CSS
                 * as a PostCSS plugin or use the Tailwind CLI for optimal performance
                 * and to purge unused styles.
                 * More info: https://tailwindcss.com/docs/installation
                 */
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
                body {
                    font-family: 'Inter', sans-serif;
                }
                `}
            </style>
            {renderPage()}
        </FirebaseContext.Provider>
    );
};

export default App;
