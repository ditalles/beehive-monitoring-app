# 🐝 HeilooHive: Beehive Monitoring Application

**HeilooHive** is a modern web app for real-time monitoring of beehive health and activity. It seamlessly integrates with [ThingSpeak](https://thingspeak.com/) to collect sensor data, providing critical insights to help beekeepers make informed, data-driven decisions.

---

## 🚀 Core Features

- **🔑 User Access:** Simple login with demo mode for instant exploration—no credentials required.
- **📡 ThingSpeak Integration:** Connect to live hive sensors using your Channel ID and Read API Key.
- **🛡️ Data Fallback:** Automatic switch to simulated/demo data if ThingSpeak access fails, ensuring the app always works.
- **📊 Dashboard Overview:**  
  - View all configured hives at a glance  
  - See latest sensor data  
  - Visual alert indicators for unread notifications  
  - Quick navigation to detailed analytics  
- **📈 Advanced Hive Analytics:**  
  - **Data Source Indicator**: See if data is live or simulated  
  - **Colony Health Score**: Aggregated from temperature, weight, and humidity  
  - **Swarm Risk Assessment**: Early warnings for proactive action  
  - **Honey Flow Analysis**: Track honey yield trends  
  - **Interactive Charts**: Explore historical sensor data by timeframe  
  - **Sensor Statistics**: Min, max, and averages for all metrics  
- **🚨 Proactive Alert System:** Get notified of sudden changes (e.g., weight loss, temperature spikes).
- **📱 Responsive Design:** Built with Tailwind CSS for perfect viewing on mobile, tablet, and desktop.
- **⚙️ Configuration Management:** Easily add, edit, or remove hives in Settings.

---

## 🛠️ Tech Stack

- **React**: Dynamic user interface
- **Recharts**: Beautiful data visualizations
- **Tailwind CSS**: Fast, responsive styling
- **ThingSpeak API**: Real-time IoT data integration

---

## 🏁 Getting Started

### Prerequisites

- **Node.js** (LTS version recommended)
- **npm** or **Yarn**

### Installation

1. **Initialize your React project** (if you haven’t already):

    ```sh
    npx create-react-app heiloo-hive
    cd heiloo-hive
    # Add the HeilooHive code to your src directory
    ```

2. **Install dependencies:**

    ```sh
    npm install recharts
    # or
    yarn add recharts
    ```

    > If you haven’t set up Tailwind CSS, follow their [React installation guide](https://tailwindcss.com/docs/guides/create-react-app).

3. **Start the application:**

    ```sh
    npm start
    # or
    yarn start
    ```

    Access the dashboard at [http://localhost:3000](http://localhost:3000).

---

## 🔗 Configuration: Connecting to Hive Data

- **Demo Mode** (default, no ThingSpeak account needed):
    - **Username:** `demo_user`
    - **Channel ID:** `123456`
    - **API Key:** `demo_api_key`
- **Live Data Mode**:  
    - Enter your own credentials to connect to your ThingSpeak-enabled hives.

*If data retrieval fails (e.g., invalid credentials), the app will automatically fall back to demo data.*

---

## 🐝 Usage Workflow

1. **Login:** Use either demo or ThingSpeak credentials.
2. **Dashboard:**  
    - Review all hives and current sensor data
    - Monitor alerts
    - Click a hive for detailed analytics
    - Use Settings (bottom right) to manage hives
3. **Hive Details:**  
    - Switch between Overview, Charts, and Honey Flow tabs
    - Visualize trends and historical data
    - Check Colony Health and Swarm Risk assessments
4. **Alerts:**  
    - Dashboard and modal highlight unread alerts
    - Mark alerts as read after review

---

## 🌱 Future Roadmap

- **Long-term Data Storage:** Integrate persistent database (e.g., Firebase Firestore)
- **Custom Alert Thresholds:** User-defined triggers
- **Multi-Apiary Management:** Organize and monitor multiple groups
- **Predictive Analytics:** Advanced models for swarming, disease, and more
- **User Profiles:** Customize dashboards and notifications
- **Data Export:** Downloadable PDF or CSV reports

---

## 💡 Our Mission

HeilooHive empowers beekeepers with actionable insights, supporting smarter, more efficient hive management—so your bees thrive!

---

> *Questions, suggestions, or want to contribute? Open an issue or pull request!*
