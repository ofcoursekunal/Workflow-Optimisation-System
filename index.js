import express from 'express'
import 'dotenv/config'
import routes from './api/routes.js'

const app = express()

// Middleware
app.use(express.json())

// Routes
app.use('/', routes)

// Test route
app.get('/', (req, res) => {
  res.send('Shopfloor System API Running 🚀')
})

// Start server
const PORT = 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})