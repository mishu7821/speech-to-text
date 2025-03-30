# Speech to Text Web Application

A modern web application built with Next.js that transcribes speech to text in real-time using the browser's Web Speech API. Transcripts can be downloaded locally or saved securely to a Supabase backend.

## ✨ Features

-   **Real-time Transcription:** Captures and displays speech as text instantly.
-   **Save Transcripts:** Option to save generated transcripts to a Supabase database.
-   **Download Transcripts:** Download transcripts directly to your device as `.txt` files.
-   **Transcription History:** View previously saved transcripts (requires Supabase integration).
-   **Theme Switching:** Toggle between light and dark modes.
-   **Responsive Design:** Adapts seamlessly to various screen sizes.
-   **Notifications:** Provides user feedback for actions like saving or errors.
-   **Modern UI:** Built with shadcn/ui and Lucide Icons for a clean interface.
-   **(Optional) Rate Limiting:** Protects server resources using Upstash Redis.

## 🛠️ Technologies Used

-   **Framework:** [Next.js](https://nextjs.org/) (App Router)
-   **Language:** [TypeScript](https://www.typescriptlang.org/)
-   **UI Library:** [React](https://react.dev/)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components:** [shadcn/ui](https://ui.shadcn.com/) (built on Radix UI)
-   **Icons:** [Lucide React](https://lucide.dev/)
-   **Speech Recognition:** [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) (via `react-speech-recognition`)
-   **Backend & Database:** [Supabase](https://supabase.com/) (Auth, Database)
-   **Theme Management:** [next-themes](https://github.com/pacocoursey/next-themes)
-   **Notifications:** [Sonner](https://sonner.emilkowal.ski/)
-   **Client-side Downloads:** `file-saver`
-   **(Optional) Rate Limiting:** [Upstash Redis](https://upstash.com/)

## 🚀 Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (v20 or higher recommended)
-   npm, yarn, or pnpm

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd speech-to-text
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or yarn install
    # or pnpm install
    ```

### Environment Setup

1.  **Create an environment file:**
    Copy the example environment file to a new file named `.env.local`:
    ```bash
    cp .env.local.example .env.local
    ```

2.  **Configure Supabase:**
    -   Create a project on [Supabase](https://supabase.com/).
    -   Navigate to your project's **Settings > API**.
    -   Find your **Project URL** and **Project API Keys** (use the `anon` `public` key).
    -   Update `.env.local` with these values:
        ```env
        NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
        NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
        ```
    -   **Important:** You will also need to set up database tables in Supabase to store the transcripts if you intend to use the "Save to Server" feature. Define the necessary table schema according to the application's data model (e.g., a `transcripts` table).

3.  **Configure Upstash Redis (Optional):**
    -   If you want to enable rate limiting:
        -   Create a database on [Upstash](https://upstash.com/).
        -   Find your **REST API** URL and Token.
        -   Update `.env.local`:
            ```env
            UPSTASH_REDIS_REST_URL=YOUR_UPSTASH_URL
            UPSTASH_REDIS_REST_TOKEN=YOUR_UPSTASH_TOKEN
            ```
    -   If you don't need rate limiting, you can leave these variables empty in `.env.local`.

4.  **Set Application URL:**
    Ensure the `APP_URL` is correctly set for your local development environment:
    ```env
    APP_URL=http://localhost:3000
    ```

### Running the Application

1.  **Start the development server:**
    ```bash
    npm run dev
    ```

2.  Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎤 Usage

1.  Allow microphone permissions when prompted by the browser.
2.  Click the "Start Recording" button.
3.  Speak clearly into your microphone. Your speech will be transcribed in real-time.
4.  Click the "Stop Recording" button when you are finished.
5.  Review the transcript. You can then:
    -   Click "Download as File" to save the transcript as a `.txt` file locally.
    -   Click "Save to Server" to store the transcript in your Supabase database (requires setup).
6.  Toggle between light and dark mode using the theme switcher (usually in the header or settings).
7.  View past saved transcripts in the history section (if implemented and Supabase is configured).

## 🌐 Browser Compatibility

This application relies heavily on the **Web Speech API**.
-   **Best Support:** Chromium-based browsers (Google Chrome, Microsoft Edge, Opera).
-   **Limited Support:** Firefox (may require enabling flags).
-   **Safari:** Support can be inconsistent and may require specific user permissions or settings.

## ☁️ Deployment

1.  **Build the application for production:**
    ```bash
    npm run build
    ```

2.  **Start the production server:**
    ```bash
    npm start
    ```

Consider deploying to platforms like [Vercel](https://vercel.com/) or [Netlify](https://www.netlify.com/), which offer seamless integration with Next.js applications. Ensure your environment variables (Supabase keys, etc.) are configured in your deployment environment.

## 📄 License

This project is open source and available under the MIT License. See the `LICENSE` file for more details (if one exists).
