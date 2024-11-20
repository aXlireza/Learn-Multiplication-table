/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useReducer } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, HelpCircle, Clock, Check, X, Bell, LogIn, LogOut, UserPlus, ChevronUp, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import { supabase } from '../supabaseClient'

const badges = [
  { name: 'Heatblast', color: '#FF5722', image: '/placeholder.svg?height=100&width=100' },
  { name: 'Four Arms', color: '#E53935', image: '/placeholder.svg?height=100&width=100' },
  { name: 'Grey Matter', color: '#607D8B', image: '/placeholder.svg?height=100&width=100' },
  { name: 'XLR8', color: '#2196F3', image: '/placeholder.svg?height=100&width=100' },
  { name: 'Diamondhead', color: '#009688', image: '/placeholder.svg?height=100&width=100' },
  { name: 'Cannonbolt', color: '#FFC107', image: '/placeholder.svg?height=100&width=100' },
  { name: 'Wildvine', color: '#4CAF50', image: '/placeholder.svg?height=100&width=100' },
  { name: 'Upgrade', color: '#3F51B5', image: '/placeholder.svg?height=100&width=100' },
  { name: 'Ghostfreak', color: '#9C27B0', image: '/placeholder.svg?height=100&width=100' },
  { name: 'Way Big', color: '#795548', image: '/placeholder.svg?height=100&width=100' },
]

type QuestionData = {
  num1: number;
  num2: number;
  timeTaken: number;
  usedHint: boolean;
  correct: boolean;
}

type State = {
  level: number;
  streak: number;
  incorrectStreak: number;
  dailyProgress: number;
  showCelebration: boolean;
  showLevelUp: boolean;
}

type Action =
  | { type: 'CORRECT_ANSWER' }
  | { type: 'INCORRECT_ANSWER' }
  | { type: 'RESET_CELEBRATION' }
  | { type: 'MANUAL_LEVEL_CHANGE'; payload: number }
  | { type: 'SET_DAILY_PROGRESS'; payload: number }

function gameReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'CORRECT_ANSWER':
      const newStreak = state.streak + 1
      const shouldLevelUp = newStreak >= 5 && state.level < badges.length
      return {
        ...state,
        streak: shouldLevelUp ? 0 : newStreak,
        incorrectStreak: 0,
        level: shouldLevelUp ? state.level + 1 : state.level,
        showCelebration: true,
        showLevelUp: shouldLevelUp,
        dailyProgress: state.dailyProgress + 1
      }
    case 'INCORRECT_ANSWER':
      const newIncorrectStreak = state.incorrectStreak + 1
      const shouldLevelDown = newIncorrectStreak >= 3 && state.level > 1
      return {
        ...state,
        streak: 0,
        incorrectStreak: shouldLevelDown ? 0 : newIncorrectStreak,
        level: shouldLevelDown ? state.level - 1 : state.level,
        showCelebration: false,
        showLevelUp: false
      }
    case 'RESET_CELEBRATION':
      return {
        ...state,
        showCelebration: false,
        showLevelUp: false
      }
    case 'MANUAL_LEVEL_CHANGE':
      return {
        ...state,
        level: Math.max(1, Math.min(action.payload, badges.length)),
        streak: 0,
        incorrectStreak: 0
      }
    case 'SET_DAILY_PROGRESS':
      return {
        ...state,
        dailyProgress: action.payload
      }
    default:
      return state
  }
}

export default function MultiplicationPractice() {
  const [state, dispatch] = useReducer(gameReducer, {
    level: 1,
    streak: 0,
    incorrectStreak: 0,
    dailyProgress: 0,
    showCelebration: false,
    showLevelUp: false
  })

  const [question, setQuestion] = useState<QuestionData>({ num1: 0, num2: 0, timeTaken: 0, usedHint: false, correct: false })
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isOnline, setIsOnline] = useState(true)
  const [showHint, setShowHint] = useState(false)
  const [hintUsed, setHintUsed] = useState(false)
  const [startTime, setStartTime] = useState(Date.now())
  const [questionHistory, setQuestionHistory] = useState<QuestionData[]>([])
  const [upcomingQuestions, setUpcomingQuestions] = useState<{num1: number, num2: number}[]>([])
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [offlineData, setOfflineData] = useState<QuestionData[]>([])

  function generateQuestion() {
    const num1 = Math.floor(Math.random() * (state.level * 2)) + 1
    const num2 = Math.floor(Math.random() * (state.level * 2)) + 1
    setQuestion({ num1, num2, timeTaken: 0, usedHint: false, correct: false })
    setAnswer('')
    setFeedback('')
    setShowHint(false)
    setHintUsed(false)
    setStartTime(Date.now())
  }

  function generateUpcomingQuestions() {
    const questions = []
    for (let i = 0; i < 5; i++) {
      const num1 = Math.floor(Math.random() * (state.level * 2)) + 1
      const num2 = Math.floor(Math.random() * (state.level * 2)) + 1
      questions.push({ num1, num2 })
    }
    setUpcomingQuestions(questions)
  }

  useEffect(() => {
    // Load saved level from localStorage
    const savedLevel = localStorage.getItem('multiplicationLevel')
    if (savedLevel) {
      dispatch({ type: 'MANUAL_LEVEL_CHANGE', payload: parseInt(savedLevel) })
    }
    // Generate initial question and upcoming questions
    generateQuestion()
    generateUpcomingQuestions()
    // Load daily progress
    loadDailyProgress()
    // Set up event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    // Handle notifications and authentication
    const notificationPermission = localStorage.getItem('notificationPermission')
    if (notificationPermission === 'granted') {
      setNotificationsEnabled(true)
      scheduleNotification()
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event:any, session:any) => {
        const currentUser = session?.user
        setUser(currentUser ?? null)
      }
    )

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      authListener?.subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    localStorage.setItem('multiplicationLevel', state.level.toString())
    console.log('Level updated:', state.level)
    // Generate new questions whenever level changes
    generateQuestion()
    generateUpcomingQuestions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.level])

  const handleOnline = () => {
    setIsOnline(true)
    syncOfflineData()
  }

  const handleOffline = () => {
    setIsOnline(false)
  }

  const syncOfflineData = async () => {
    if (offlineData.length > 0 && user) {
      try {
        const { data, error } = await supabase
          .from('question_logs')
          .insert(offlineData)
        
        if (error) throw error

        setOfflineData([])
        localStorage.removeItem('offlineData')
      } catch (error) {
        console.error('Error syncing offline data:', error)
      }
    }
  }

  const checkAnswer = () => {
    const timeTaken = (Date.now() - startTime) / 1000
    const correctAnswer = question.num1 * question.num2
    const isCorrect = parseInt(answer) === correctAnswer
    const updatedQuestion = { ...question, timeTaken, usedHint: hintUsed, correct: isCorrect }

    setQuestionHistory(prev => [...prev, updatedQuestion])

    if (isOnline && user) {
      saveQuestionLog(updatedQuestion)
    } else {
      setOfflineData(prev => [...prev, updatedQuestion])
      localStorage.setItem('offlineData', JSON.stringify([...offlineData, updatedQuestion]))
    }

    if (isCorrect) {
      setFeedback('Correct! Great job! 🎉')
      dispatch({ type: 'CORRECT_ANSWER' })
    } else {
      setFeedback(`Oops! The correct answer is ${correctAnswer}. Keep trying! 💪`)
      dispatch({ type: 'INCORRECT_ANSWER' })
    }

    setTimeout(() => {
      generateQuestion()
      generateUpcomingQuestions()
      dispatch({ type: 'RESET_CELEBRATION' })
    }, 2000)
  }

  const saveQuestionLog = async (questionData: QuestionData) => {
    try {
      const { data, error } = await supabase
        .from('question_logs')
        .insert([
          {
            user_id: user?.id || null,
            num1: questionData.num1,
            num2: questionData.num2,
            user_answer: parseInt(answer),
            is_correct: questionData.correct,
            time_taken: questionData.timeTaken,
            hint_used: questionData.usedHint
          }
        ])
      
      if (error) throw error
    } catch (error) {
      console.error('Error saving question log:', error)
    }
  }

  const loadDailyProgress = () => {
    const savedProgress = localStorage.getItem('dailyProgress')
    const lastPracticeDate = localStorage.getItem('lastPracticeDate')
    const today = new Date().toDateString()

    if (lastPracticeDate === today && savedProgress) {
      dispatch({ type: 'SET_DAILY_PROGRESS', payload: parseInt(savedProgress) })
    } else {
      dispatch({ type: 'SET_DAILY_PROGRESS', payload: 0 })
      localStorage.setItem('dailyProgress', '0')
      localStorage.setItem('lastPracticeDate', today)
    }
  }

  const renderHint = () => {
    const total = question.num1 * question.num2
    return (
      <div className="grid grid-cols-5 gap-1 justify-center">
        {Array.from({ length: 25 }).map((_, i) => (
          <div 
            key={i} 
            className={`w-4 h-4 rounded-full ${i < total ? 'bg-primary' : 'bg-gray-200'}`}
          ></div>
        ))}
      </div>
    )
  }

  const toggleHint = () => {
    setShowHint(!showHint)
    if (!hintUsed) {
      setHintUsed(true)
    }
  }

  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setNotificationsEnabled(true)
        localStorage.setItem('notificationPermission', 'granted')
        scheduleNotification()
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error)
    }
  }

  const scheduleNotification = () => {
    const now = new Date()
    const scheduledTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0, 0)
    
    if (now > scheduledTime) {
      scheduledTime.setDate(scheduledTime.getDate() + 1)
    }

    const timeUntilNotification = scheduledTime.getTime() - now.getTime()

    setTimeout(() => {
      new Notification('Multiplication Practice Reminder', {
        body: 'It\'s time for your daily multiplication practice!',
        icon: '/favicon.ico'
      })
      scheduleNotification()
    }, timeUntilNotification)
  }

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      alert('Check your email for the login link!')
    } catch (error:any) {
      alert(error.message)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } catch (error:any) {
      alert(error.message)
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error:any) {
      alert(error.message)
    }
  }

  const changeLevel = (increment: number) => {
    dispatch({ type: 'MANUAL_LEVEL_CHANGE', payload: state.level + increment })
  }

  const currentBadge = badges[state.level - 1]

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: currentBadge.color }}>
      <Card className="w-full max-w-4xl mx-auto relative overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Multiplication Practice</CardTitle>
              <CardDescription>Level {state.level} - {currentBadge.name}</CardDescription>
            </div>
            {user ? (
              <Button onClick={signOut} variant="outline">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e:any) => setEmail(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e:any) => setPassword(e.target.value)}
                />
                <Button onClick={() => signIn(email, password)}>
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
                <Button onClick={() => signUp(email, password)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Sign Up
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button onClick={() => changeLevel(-1)} disabled={state.level === 1}>
                <ChevronDown className="w-4 h-4" />
              </Button>
              <span className="text-lg font-semibold">Level {state.level}</span>
              <Button onClick={() => changeLevel(1)} disabled={state.level === badges.length}>
                <ChevronUp className="w-4 h-4" />
              </Button>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={question.num1 + question.num2}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-4xl font-bold text-center"
              >
                {question.num1} × {question.num2} = ?
              </motion.div>
            </AnimatePresence>
            <Input
              type="number"
              placeholder="Enter your answer"
              value={answer}
              onChange={(e:any) => setAnswer(e.target.value)}
              className="text-2xl text-center"
            />
            <div className="flex space-x-2">
              <Button onClick={checkAnswer} className="flex-1" style={{ backgroundColor: currentBadge.color }}>
                Check Answer
              </Button>
              <Button onClick={toggleHint} variant="outline" className="flex-none">
                <HelpCircle className="w-6 h-6" />
                <span className="sr-only">Show Hint</span>
              </Button>
            </div>
            {showHint && (
              <div className="mt-4 p-4 bg-secondary rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Hint:</h3>
                {renderHint()}
              </div>
            )}
            <div className="text-center font-semibold">
              {feedback}
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span>Daily Progress</span>
                <span>{state.dailyProgress} questions</span>
              </div>
              <Progress value={state.dailyProgress} max={20} className="w-full" style={{ '--theme-primary': currentBadge.color } as React.CSSProperties} />
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Question History</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {questionHistory.slice(-5).reverse().map((q, index) => (
                <div key={index} className="flex items-center justify-between bg-secondary p-2 rounded">
                  <span>{q.num1} × {q.num2} = {q.num1 * q.num2}</span>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>{q.timeTaken.toFixed(1)}s</span>
                    {q.usedHint && <HelpCircle className="w-4 h-4" />}
                    {q.correct ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-500" />}
                  </div>
                </div>
              ))}
            </div>
            <h3 className="text-lg font-semibold">Upcoming Questions</h3>
            <div className="space-y-2">
              {upcomingQuestions.map((q, index) => (
                <div key={index} className="bg-secondary p-2 rounded">
                  {q.num1} × {q.num2}
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button 
                onClick={requestNotificationPermission} 
                disabled={notificationsEnabled}
                className="w-full"
              >
                <Bell className="w-4 h-4 mr-2" />
                {notificationsEnabled ? 'Notifications Enabled' : 'Enable Daily Reminders'}
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <div>Streak: {state.streak}/5</div>
          <div>Next Badge: {state.level < badges.length ? badges[state.level].name : 'Max Level'}</div>
        </CardFooter>
        {!isOnline && (
          <div className="bg-yellow-100 text-yellow-800 text-sm p-2 text-center">
            You&apos;re offline. Don&apos;t worry, you can still practice! Your progress will be saved and synced when you&apos;re back online.
          </div>
        )}
        <AnimatePresence>
          {state.showCelebration && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50"
            >
              <div className="text-6xl">🎉</div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {state.showLevelUp && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-75 text-white"
            >
              <h2 className="text-3xl font-bold mb-4">Level Up!</h2>
              <Image 
                src={currentBadge.image} 
                alt={currentBadge.name} 
                width={120} 
                height={120} 
                className="rounded-full border-4 border-white shadow-lg mb-4"
              />
              <p className="text-xl">You&apos;ve unlocked {currentBadge.name}!</p>
            </motion.div>
          )}
        </AnimatePresence>
        {state.incorrectStreak > 0 && (
          <div className="absolute top-2 right-2 text-yellow-500">
            <AlertCircle size={24} />
            <span className="sr-only">Warning: {state.incorrectStreak} incorrect answers in a row</span>
          </div>
        )}
      </Card>
    </div>
  )
}
