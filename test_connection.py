from supabase import create_client, Client

url = "https://rvckjegiqohgllpxwmfi.supabase.co/rest/v1/"

key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Y2tqZWdpcW9oZ2xscHh3bWZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MjYwMDYsImV4cCI6MjA5NTEwMjAwNn0.wYjAW6Cdkr9SxOdKbe8rBRGjYd1IqCA5BMiyRzEG6GI"

supabase: Client = create_client(url, key)

print("connection ok")