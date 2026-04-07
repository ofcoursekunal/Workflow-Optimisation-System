# Smart Shop-Floor Workflow System

This project is a backend system using:

* Node.js (Express)
* Supabase (PostgreSQL + Auth)

Core features:

* Job creation and tracking
* Assignment suggestion system
* Supervisor approval system
* Worker job execution
* Alerts (idle, delay)
* Role-based system (labour, supervisor, manager)

Database tables:

* users
* jobs
* machines
* assignments
* alerts

Workflow:
Job Created → Suggest Assignment → Supervisor Approval → Assigned → In Progress → Completed

Instructions:

* Use clean modular structure
* Use async/await
* Use supabase-js for database
* Keep code simple and production-ready
