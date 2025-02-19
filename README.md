# **Shopulse**  

## **📌 Overview**  
Shopulse is a research-driven **e-commerce prototype** developed as part of the thesis **[An Explorative Study on User Behaviors with LLM-powered CUI and with GUI](https://tdr.lib.ntu.edu.tw/handle/123456789/94361)**. The project explores the impact of **Conversational User Interfaces (CUI), Graphical User Interfaces (GUI), and Hybrid UIs** on user experience in online shopping.  

🔗 **[Jump to the Demo](#-demo)**  

## **🚀 Features**  
### **AI-Assisted Product Interaction**
- **Conversational UI**: Integrates an AI chatbot (OpenAI’s Assistant API) to help users find relevant products, explain technical details, and compare multiple items.
- **Hybrid UI**: A dual-pane layout with AI chat on the left and product listings on the right, where the right panel dynamically updates with product details, seamlessly integrating AI-driven assistance with a familiar e-commerce browsing experience.

### **Real-Time Communication**
- **Server-Sent Events (SSE)**: Implements live chat updates to keep interactions responsive without constant page reloading.
- **Context-Aware Responses**: The chatbot refines its suggestions and explanations based on conversation history and user inputs.

### **Product Data Collection**
- **Web Scraper (Puppeteer)**: Collects product information from Amazon and Walmart, storing the data in MongoDB.
- **Search & Filtering**: Offers keyword-based and chatbot-driven search, along with basic filtering options for user convenience.

### **Deployment & Infrastructure**
- **Infrastructure as Code (Terraform)**: Automates resource provisioning and management, making deployments more consistent and easier to maintain.
- **AWS Integration**: Utilizes AWS EC2, CloudFront, S3, and ELB for hosting, content delivery, and load balancing.

### **User Testing & Feedback**
- **Tested by 106 Users**: While not a large-scale commercial release, the system was tried by a diverse group of participants. Feedback indicated general ease of use and appreciation for the option to interact via conversation or traditional browsing.

## **🛠 Tech Stack**  
| **Category** | **Technologies** |
|-------------|-----------------|
| **Frontend** | React.js, Vite, Tailwind CSS |
| **Backend** | Node.js, Express.js, MongoDB |
| **AI & NLP** | OpenAI GPT-4o-mini, OpenAI Assistant API |
| **Web Scraper** | Puppeteer |
| **Cloud Services** | EC2, CloudFront, S3, ELB, ACM |

---

## **📂 Prerequisites**  

Before running the project, ensure your system meets the following requirements:  

### **1️⃣ Install Node.js & Package Manager**  
This project requires **Node.js 18+**. Download from: [Node.js Official Site](https://nodejs.org/en/download/)  

Check your installation:  
```bash
node -v
npm -v
```

We recommend **yarn** for the frontend. Install it globally if you haven’t:  
```bash
npm install -g yarn
```

### **2️⃣ Install MongoDB**  
Set up **MongoDB locally** or use **MongoDB Atlas**:  
- [Download MongoDB](https://www.mongodb.com/try/download/community)  
- Start MongoDB:  
  ```bash
  mongod
  ```
  

### **3️⃣ Set Up OpenAI API Key**  
Create an OpenAI account and obtain an API key:  
🔗 [Get OpenAI API Key](https://platform.openai.com/signup)  

---

## **📥 Installation**  

### **1️⃣ Clone the Repository**  
```bash
git clone https://github.com/minchenlee/Thesis.git
cd shopulse
```

### **2️⃣ Configure Environment Variables**  
Create the required `.env` files in the respective directories:  

#### **📍 Backend (`backend/.env`)**
```env
MONGODB_URL="your-mongodb-url"
OPENAI_API_KEY="your-openai-api-key"
OPENAI_ASSISTANT_ID="your-openai-assistant-id"
PORT=3000
```

#### **📍 Frontend (`frontend/.env`)**
```env
VITE_API_BASE_URL=http://localhost:3000
```

#### **📍 Crawler (`crawler/.env`)**
```env
MONGODB_URL="your-mongodb-url"
```

### **3️⃣ Install Dependencies**  
Run the following commands inside each directory:  

#### **📍 Backend**  
```bash
cd backend
npm install
```

#### **📍 Frontend**  
```bash
cd frontend
yarn install
```

#### **📍 Crawler (Scraper)**  
```bash
cd crawler
npm install
```

### **4️⃣ Populate the Database**  
You can either:  
✅ **Use the Web Scraper** to collect real-time product data from Amazon and Walmart  
or  
✅ **Load Sample Data** from `backend/sample.json` into MongoDB

You should notice that this project use the Altas's text search, so you need to create search index first on your Altas's cluster.  
  [Create Search Index](https://docs.atlas.mongodb.com/reference/atlas-search/create-index/)

---

## **🛠 Running the Project**  

Start the **backend and frontend servers**:  

#### **📍 Backend**  
```bash
npm start
```

#### **📍 Frontend**  
```bash
yarn run dev
```

---

## **🔗 Demo**  

The prototype is deployed and accessible through the following links. The site will request a **Prolific ID** (a unique user identifier)—you can enter any string.  

| **Interface Type** | **Live Demo** | **Preview** |
|-------------------|-------------|------------|
| **Conversational UI (CUI)** | [🔗 View Here](https://shopulse.shop/chat) | ![CUI](https://imgur.com/wWfNv5K.png) |
| **Graphical UI (GUI)** | [🔗 View Here](https://shopulse.shop/gui) | ![GUI](https://imgur.com/ZMr1k9Z.png) |
| **Hybrid UI** | [🔗 View Here](https://shopulse.shop/hybrid) | ![Hybrid UI](https://imgur.com/yaQ4arF.png) |

---

## **📜 License**  
This project is for research purposes and is licensed under [MIT License](LICENSE).

