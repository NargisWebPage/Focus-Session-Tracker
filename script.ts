
"use strict";

// Focus Session Tracker

console.log("TypeScript is working!");



// Get HTML Elements


const timerDisplay = document.getElementById("timer-display") as HTMLParagraphElement;

const startBtn = document.getElementById("startBtn") as HTMLButtonElement;
const pauseBtn = document.getElementById("pauseBtn") as HTMLButtonElement;
const resetBtn = document.getElementById("resetBtn") as HTMLButtonElement;

const lengthButtons = document.querySelectorAll<HTMLButtonElement>(
    "#lengthButtons button"
);

const darkMoodBtn = document.getElementById("darkMood") as HTMLButtonElement;

const progressText = document.getElementById("progressText") as HTMLParagraphElement;
const progressPercent = document.getElementById("progressPercent") as HTMLParagraphElement;
const progressFill = document.querySelector(".progress-fill") as HTMLDivElement;

const dailyGoalDisplay = document.querySelector(".progress h2") as HTMLHeadingElement;
const editGoalBtn = document.getElementById("editGoal") as HTMLButtonElement;

const sessionTable = document.querySelector(
    ".session-history tbody"
) as HTMLTableSectionElement;

const timerCircle = document.querySelector(".timer-circle") as HTMLDivElement;



// Session Interface


interface Session {
    date: string;
    duration: number;
    time: string;
}



// Local Storage Keys


const SESSION_KEY = "focusSessions";
const GOAL_KEY = "dailyGoal";
const DURATION_KEY = "selectedDuration";
const THEME_KEY = "darkMode";



// Timer Variables

// Load previously selected duration
const savedDuration = Number(localStorage.getItem(DURATION_KEY));

let selectedDuration: number =
    Number.isInteger(savedDuration) &&
    savedDuration >= 1 &&
    savedDuration <= 240
        ? savedDuration
        : 25;

// Remaining time in seconds
let remainingTime: number = selectedDuration * 60;

// Store timer interval
let timerInterval: number | undefined;

// Check whether timer is running
let isRunning: boolean = false;


// Daily Goal Variables


// Load saved daily goal
const savedGoal = Number(localStorage.getItem(GOAL_KEY));

let dailyGoal: number =
    Number.isFinite(savedGoal) && savedGoal > 0
        ? savedGoal
        : 120;

// Total completed minutes today
let completedMinutes: number = 0;



// Session History


// Load saved sessions
let sessions: Session[] = [];

const savedSessions = localStorage.getItem(SESSION_KEY);

if (savedSessions) {
    try {
        const parsedSessions: unknown = JSON.parse(savedSessions);

        if (Array.isArray(parsedSessions)) {
            sessions = parsedSessions.filter(
                (session: unknown): session is Session => {

                    if (typeof session !== "object" || session === null) {
                        return false;
                    }

                    const item = session as Record<string, unknown>;

                    return (
                        typeof item.date === "string" &&
                        typeof item.duration === "number" &&
                        typeof item.time === "string"
                    );
                }
            );
        }
    } catch {
        sessions = [];
    }
}


// Save sessions to localStorage
function saveSessions(): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
}


// Get today's date
function getTodayDate(): string {
    return new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric"
    });
}


// Restore today's completed minutes
function restoreProgress(): void {

    completedMinutes = sessions.reduce(
        (total, session) => {

            if (session.date === getTodayDate()) {
                return total + session.duration;
            }

            return total;

        },
        0
    );
}



// Audio Variables


// Store audio context
let audioContext: AudioContext | null = null;


// Enable audio when user starts the timer
function enableAlarmAudio(): void {

    if (!audioContext) {
        audioContext = new AudioContext();
    }

    if (audioContext.state === "suspended") {
        void audioContext.resume();
    }
}


// Display Timer

function updateTimerDisplay(): void {

    // Convert seconds into minutes and seconds
    const minutes: number = Math.floor(remainingTime / 60);

    const seconds: number = remainingTime % 60;

    // Display time as MM:SS
    timerDisplay.textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    // Update circular timer progress
    const progress: number =
        ((selectedDuration * 60 - remainingTime) / (selectedDuration * 60)) * 100;

    timerCircle.style.setProperty("--timer-progress", `${progress}%`);
}



// Start Timer

function startTimer(): void {

    // Enable audio after user clicks Start
    enableAlarmAudio();

    // Prevent multiple intervals
    if (isRunning) return;

    // Don't start if timer has finished
    if (remainingTime <= 0) return;

    isRunning = true;

    timerInterval = window.setInterval(() => {

        remainingTime--;

        updateTimerDisplay();

        // Check whether timer has finished
        if (remainingTime <= 0) {

            clearInterval(timerInterval);

            isRunning = false;

            completeSession();
        }

    }, 1000);
}



// Pause Timer


function pauseTimer(): void {

    // Stop timer without resetting its time
    if (timerInterval !== undefined) {
        clearInterval(timerInterval);
    }

    isRunning = false;
}



// Reset Timer

function resetTimer(): void {

    // Stop running timer
    pauseTimer();

    // Restore selected duration
    remainingTime = selectedDuration * 60;

    updateTimerDisplay();
}



// Select Session Duration

lengthButtons.forEach((button: HTMLButtonElement) => {

    button.addEventListener("click", () => {

        // Don't change duration while timer is running
        if (isRunning) {
            alert("Please pause the timer before changing the duration.");
            return;
        }

        let newDuration: number;

        // Check if Custom button was clicked
        if (button.id === "customDurationBtn") {

            const customInput: string | null = prompt(
                "Enter your session duration in minutes (1–240):"
            );

            // Stop if user cancels
            if (customInput === null) return;

            newDuration = Number(customInput);

            // Validate custom duration
            if (
                !Number.isInteger(newDuration) ||
                newDuration < 1 ||
                newDuration > 240
            ) {
                alert("Please enter a whole number between 1 and 240.");
                return;
            }

        } else {

            // Get duration from preset button
            newDuration = Number(button.dataset.duration);
        }

        // Update selected duration
        selectedDuration = newDuration;

        // Save selected duration
        localStorage.setItem(DURATION_KEY, String(selectedDuration));

        // Reset remaining time
        remainingTime = selectedDuration * 60;

        updateTimerDisplay();

        // Remove selected styling
        lengthButtons.forEach((btn: HTMLButtonElement) => {
            btn.style.background = "";
            btn.style.color = "";
        });

        // Highlight selected button
        button.style.background =
            "linear-gradient(135deg, #8d70ff, #6947ed)";

        button.style.color = "#ffffff";

    });

});



// Timer Alarm Sound

function playAlarm(): void {

    if (!audioContext) return;

    // Create sound oscillator
    const oscillator = audioContext.createOscillator();

    // Control sound volume
    const gainNode = audioContext.createGain();

    oscillator.type = "square";
    oscillator.frequency.value = 880;

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const startTime = audioContext.currentTime;

    // Create five warning beeps
    for (let i = 0; i < 5; i++) {

        const beepStart = startTime + i * 0.9;

        gainNode.gain.setValueAtTime(0.2, beepStart);
        gainNode.gain.setValueAtTime(0, beepStart + 0.5);
    }

    // Play alarm
    oscillator.start(startTime);

    // Stop after 5 seconds
    oscillator.stop(startTime + 5);
}


// Complete Session


function completeSession(): void {

    // Add completed duration to today's progress
    completedMinutes += selectedDuration;

    updateProgress();

    // Get current date and time
    const now: Date = new Date();

    // Create new session
    const newSession: Session = {

        date: getTodayDate(),

        duration: selectedDuration,

        time: now.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit"
        })
    };

    // Add session to history
    sessions.push(newSession);

    // Save session history
    saveSessions();

    // Update history table
    displaySessions();

    // Play alarm sound
    playAlarm();

    // Show completion message
    alert("Great job! Your focus session is complete.");

}



// Update Daily Progress

function updateProgress(): void {

    // Calculate percentage of daily goal
    const percentage: number = Math.min(
        Math.round((completedMinutes / dailyGoal) * 100),
        100
    );

    // Convert completed minutes into hours and minutes
    const hours: number = Math.floor(completedMinutes / 60);

    const minutes: number = completedMinutes % 60;

    let completedText: string;

    if (hours > 0 && minutes > 0) {
        completedText = `${hours} hr ${minutes} min completed`;
    } else if (hours > 0) {
        completedText = `${hours} hr completed`;
    } else {
        completedText = `${minutes} min completed`;
    }

    progressText.textContent = completedText;

    progressPercent.textContent = `${percentage}%`;

    progressFill.style.width = `${percentage}%`;

    // Display daily goal
    const goalHours: number = Math.floor(dailyGoal / 60);

    const goalMinutes: number = dailyGoal % 60;

    dailyGoalDisplay.textContent =
        goalMinutes === 0
            ? `${goalHours} hours`
            : `${goalHours} hr ${goalMinutes} min`;
}



// Edit Daily Goal


editGoalBtn.addEventListener("click", () => {

    const newGoal: string | null = prompt(
        "Enter your daily goal in minutes:"
    );

    if (newGoal === null) return;

    const goal: number = Number(newGoal);

    // Validate entered goal
    if (!Number.isFinite(goal) || goal <= 0) {
        alert("Please enter a valid number greater than zero.");
        return;
    }

    // Update daily goal
    dailyGoal = goal;

    // Save daily goal
    localStorage.setItem(GOAL_KEY, String(dailyGoal));

    updateProgress();

});



// Display Session History

function displaySessions(): void {

    // Clear old table rows
    sessionTable.innerHTML = "";

    // Display newest sessions first
    sessions.forEach((session: Session, index: number) => {

        const row: HTMLTableRowElement = document.createElement("tr");

        // Get the correct original array index
        const actualIndex: number = sessions.length - 1 - index;

        row.innerHTML = `
            <td>${session.date}</td>
            <td>${session.duration} min</td>
            <td>${session.time}</td>
            <td>
                <button class="delete-session"
                    data-index="${actualIndex}"
                    aria-label="Delete session">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        `;

        sessionTable.appendChild(row);

    });

}



// Delete Session

sessionTable.addEventListener("click", (event: MouseEvent) => {

    const target = event.target as HTMLElement;

    const deleteButton = target.closest(
        ".delete-session"
    ) as HTMLButtonElement | null;

    if (!deleteButton) return;

    const index: number = Number(deleteButton.dataset.index);

    if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= sessions.length
    ) {
        return;
    }

    // Confirm before deleting
    const confirmed: boolean = confirm("Delete this session?");

    if (!confirmed) return;

    // Get session before deleting
    const deletedSession = sessions[index];

    if (!deletedSession) return;

    // Remove session
    sessions.splice(index, 1);

    // Remove minutes from today's progress only
    if (deletedSession.date === getTodayDate()) {
        completedMinutes -= deletedSession.duration;
    }

    // Save updated history
    saveSessions();

    updateProgress();

    displaySessions();

});


// Dark Mode


// Restore previously selected theme
const savedTheme = localStorage.getItem(THEME_KEY);

if (savedTheme === "true") {
    document.body.classList.add("dark-mode");
    darkMoodBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
} else {
    document.body.classList.remove("dark-mode");
    darkMoodBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
}

// Toggle dark mode
darkMoodBtn.addEventListener("click", () => {

    document.body.classList.toggle("dark-mode");

    const isDark: boolean =
        document.body.classList.contains("dark-mode");

    // Change icon
    darkMoodBtn.innerHTML = isDark
        ? '<i class="fa-solid fa-sun"></i>'
        : '<i class="fa-solid fa-moon"></i>';

    // Save selected theme
    localStorage.setItem(THEME_KEY, String(isDark));

});



// Button Event Listeners


startBtn.addEventListener("click", startTimer);

pauseBtn.addEventListener("click", pauseTimer);

resetBtn.addEventListener("click", resetTimer);



// Initial Setup

// Restore today's progress
restoreProgress();

// Display timer
updateTimerDisplay();

// Display daily progress
updateProgress();

// Display saved sessions
displaySessions();


// Restore selected duration button styling
lengthButtons.forEach((button: HTMLButtonElement) => {

    const isSelected =
        button.id === "customDurationBtn"
            ? false
            : Number(button.dataset.duration) === selectedDuration;

    if (isSelected) {
        button.style.background =
            "linear-gradient(135deg, #8d70ff, #6947ed)";

        button.style.color = "#ffffff";
    }

});
