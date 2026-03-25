import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Clean up existing data
  await prisma.certificate.deleteMany()
  await prisma.quizAttempt.deleteMany()
  await prisma.progress.deleteMany()
  await prisma.enrollment.deleteMany()
  await prisma.question.deleteMany()
  await prisma.quiz.deleteMany()
  await prisma.lesson.deleteMany()
  await prisma.module.deleteMany()
  await prisma.course.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.verificationToken.deleteMany()
  await prisma.user.deleteMany()

  // Create users
  const adminPassword = await bcrypt.hash("password123", 12)
  const learnerPassword = await bcrypt.hash("password123", 12)

  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@aokare.com",
      hashedPassword: adminPassword,
      role: "ADMIN",
    },
  })
  console.log("Created admin:", admin.email)

  const learner = await prisma.user.create({
    data: {
      name: "Jane Learner",
      email: "learner@aokare.com",
      hashedPassword: learnerPassword,
      role: "LEARNER",
    },
  })
  console.log("Created learner:", learner.email)

  // Course 1: Introduction to Web Development
  const course1 = await prisma.course.create({
    data: {
      title: "Introduction to Web Development",
      slug: "intro-web-dev",
      description:
        "Learn the fundamentals of web development including HTML, CSS, and JavaScript. Build your first website from scratch.",
      status: "PUBLISHED",
    },
  })

  const c1m1 = await prisma.module.create({
    data: {
      courseId: course1.id,
      title: "HTML Basics",
      description: "Learn the building blocks of the web",
      order: 0,
    },
  })

  const c1m1Lessons = await Promise.all([
    prisma.lesson.create({
      data: {
        moduleId: c1m1.id,
        title: "What is HTML?",
        order: 0,
        contentType: "TEXT",
        contentBody: [
          { type: "heading", level: 1, content: "What is HTML?" },
          {
            type: "text",
            content:
              "HTML (HyperText Markup Language) is the standard markup language for creating web pages. It describes the structure of a web page using a series of elements.",
          },
          {
            type: "code",
            language: "html",
            content:
              '<!DOCTYPE html>\n<html>\n<head>\n  <title>My First Page</title>\n</head>\n<body>\n  <h1>Hello World!</h1>\n</body>\n</html>',
          },
        ],
      },
    }),
    prisma.lesson.create({
      data: {
        moduleId: c1m1.id,
        title: "HTML Elements and Tags",
        order: 1,
        contentType: "TEXT",
        contentBody: [
          { type: "heading", level: 1, content: "HTML Elements and Tags" },
          {
            type: "text",
            content:
              "HTML elements are the building blocks of HTML pages. They are represented by tags. Tags usually come in pairs: an opening tag and a closing tag.",
          },
          {
            type: "code",
            language: "html",
            content:
              "<p>This is a paragraph.</p>\n<a href=\"https://example.com\">This is a link</a>\n<img src=\"image.jpg\" alt=\"An image\">",
          },
        ],
      },
    }),
    prisma.lesson.create({
      data: {
        moduleId: c1m1.id,
        title: "Forms and Input",
        order: 2,
        contentType: "TEXT",
        contentBody: [
          { type: "heading", level: 1, content: "HTML Forms" },
          {
            type: "text",
            content:
              "Forms are used to collect user input. The <form> element contains form elements like text fields, checkboxes, and submit buttons.",
          },
          {
            type: "code",
            language: "html",
            content:
              '<form action="/submit" method="POST">\n  <label for="name">Name:</label>\n  <input type="text" id="name" name="name">\n  <button type="submit">Submit</button>\n</form>',
          },
        ],
      },
    }),
  ])

  await prisma.quiz.create({
    data: {
      moduleId: c1m1.id,
      title: "HTML Basics Quiz",
      description: "Test your knowledge of HTML fundamentals",
      passingScore: 70,
      questions: {
        create: [
          {
            text: "What does HTML stand for?",
            type: "MCQ",
            options: [
              "Hyper Text Markup Language",
              "High Tech Modern Language",
              "Hyper Transfer Markup Language",
              "Home Tool Markup Language",
            ],
            correctAnswer: "Hyper Text Markup Language",
            explanation:
              "HTML stands for HyperText Markup Language, the standard language for web pages.",
          },
          {
            text: "Which tag is used for the largest heading?",
            type: "MCQ",
            options: ["<h6>", "<h1>", "<heading>", "<head>"],
            correctAnswer: "<h1>",
            explanation:
              "<h1> is the largest heading tag. Heading tags go from <h1> (largest) to <h6> (smallest).",
          },
          {
            text: "HTML tags are case-sensitive.",
            type: "TRUEFALSE",
            options: ["True", "False"],
            correctAnswer: "False",
            explanation:
              "HTML tags are not case-sensitive, though lowercase is recommended.",
          },
        ],
      },
    },
  })

  const c1m2 = await prisma.module.create({
    data: {
      courseId: course1.id,
      title: "CSS Fundamentals",
      description: "Style your web pages with CSS",
      order: 1,
    },
  })

  await Promise.all([
    prisma.lesson.create({
      data: {
        moduleId: c1m2.id,
        title: "Introduction to CSS",
        order: 0,
        contentType: "TEXT",
        contentBody: [
          { type: "heading", level: 1, content: "Introduction to CSS" },
          {
            type: "text",
            content:
              "CSS (Cascading Style Sheets) is used to style and layout web pages. It controls colors, fonts, spacing, and the overall visual presentation.",
          },
        ],
      },
    }),
    prisma.lesson.create({
      data: {
        moduleId: c1m2.id,
        title: "Selectors and Properties",
        order: 1,
        contentType: "TEXT",
        contentBody: [
          { type: "heading", level: 1, content: "CSS Selectors" },
          {
            type: "text",
            content:
              "CSS selectors are used to target HTML elements. Common selectors include element, class, and ID selectors.",
          },
          {
            type: "code",
            language: "css",
            content:
              "/* Element selector */\np { color: blue; }\n\n/* Class selector */\n.highlight { background: yellow; }\n\n/* ID selector */\n#header { font-size: 24px; }",
          },
        ],
      },
    }),
    prisma.lesson.create({
      data: {
        moduleId: c1m2.id,
        title: "Flexbox Layout",
        order: 2,
        contentType: "TEXT",
        contentBody: [
          { type: "heading", level: 1, content: "CSS Flexbox" },
          {
            type: "text",
            content:
              "Flexbox is a one-dimensional layout method for arranging items in rows or columns. It makes it easy to design flexible responsive layout structures.",
          },
          {
            type: "code",
            language: "css",
            content:
              ".container {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  gap: 16px;\n}",
          },
        ],
      },
    }),
  ])

  await prisma.quiz.create({
    data: {
      moduleId: c1m2.id,
      title: "CSS Fundamentals Quiz",
      description: "Test your CSS knowledge",
      passingScore: 70,
      questions: {
        create: [
          {
            text: "What does CSS stand for?",
            type: "MCQ",
            options: [
              "Cascading Style Sheets",
              "Creative Style System",
              "Computer Style Sheets",
              "Colorful Style Sheets",
            ],
            correctAnswer: "Cascading Style Sheets",
          },
          {
            text: "Which property is used to change the background color?",
            type: "MCQ",
            options: [
              "background-color",
              "bgcolor",
              "color-background",
              "bg-color",
            ],
            correctAnswer: "background-color",
          },
          {
            text: "The display: flex property creates a flex container.",
            type: "TRUEFALSE",
            options: ["True", "False"],
            correctAnswer: "True",
          },
        ],
      },
    },
  })

  const c1m3 = await prisma.module.create({
    data: {
      courseId: course1.id,
      title: "JavaScript Basics",
      description: "Add interactivity with JavaScript",
      order: 2,
    },
  })

  await Promise.all([
    prisma.lesson.create({
      data: {
        moduleId: c1m3.id,
        title: "Variables and Data Types",
        order: 0,
        contentType: "TEXT",
        contentBody: [
          { type: "heading", level: 1, content: "Variables and Data Types" },
          {
            type: "text",
            content:
              "JavaScript has three ways to declare variables: var, let, and const. Modern JavaScript primarily uses let and const.",
          },
          {
            type: "code",
            language: "javascript",
            content:
              'const name = "Alice";\nlet age = 25;\nconst isStudent = true;\nconst scores = [90, 85, 92];',
          },
        ],
      },
    }),
    prisma.lesson.create({
      data: {
        moduleId: c1m3.id,
        title: "Functions",
        order: 1,
        contentType: "TEXT",
        contentBody: [
          { type: "heading", level: 1, content: "JavaScript Functions" },
          {
            type: "text",
            content:
              "Functions are reusable blocks of code. They can accept parameters and return values.",
          },
          {
            type: "code",
            language: "javascript",
            content:
              "function greet(name) {\n  return `Hello, ${name}!`;\n}\n\nconst add = (a, b) => a + b;",
          },
        ],
      },
    }),
    prisma.lesson.create({
      data: {
        moduleId: c1m3.id,
        title: "DOM Manipulation",
        order: 2,
        contentType: "TEXT",
        contentBody: [
          { type: "heading", level: 1, content: "DOM Manipulation" },
          {
            type: "text",
            content:
              "The Document Object Model (DOM) allows JavaScript to interact with HTML elements on the page.",
          },
          {
            type: "code",
            language: "javascript",
            content:
              'const button = document.querySelector("#myButton");\nbutton.addEventListener("click", () => {\n  document.querySelector("#output").textContent = "Button clicked!";\n});',
          },
        ],
      },
    }),
  ])

  await prisma.quiz.create({
    data: {
      moduleId: c1m3.id,
      title: "JavaScript Basics Quiz",
      description: "Test your JavaScript knowledge",
      passingScore: 70,
      questions: {
        create: [
          {
            text: "Which keyword declares a constant variable in JavaScript?",
            type: "MCQ",
            options: ["var", "let", "const", "define"],
            correctAnswer: "const",
          },
          {
            text: "Arrow functions were introduced in ES6.",
            type: "TRUEFALSE",
            options: ["True", "False"],
            correctAnswer: "True",
          },
          {
            text: "What method is used to select an element by its ID?",
            type: "MCQ",
            options: [
              "document.getElementById()",
              "document.getElement()",
              "document.findById()",
              "document.selectId()",
            ],
            correctAnswer: "document.getElementById()",
          },
          {
            text: "What does DOM stand for?",
            type: "MCQ",
            options: [
              "Document Object Model",
              "Data Object Model",
              "Digital Output Module",
              "Display Object Management",
            ],
            correctAnswer: "Document Object Model",
          },
        ],
      },
    },
  })

  // Course 2: Python for Data Science
  const course2 = await prisma.course.create({
    data: {
      title: "Python for Data Science",
      slug: "python-data-science",
      description:
        "Master Python programming for data analysis, visualization, and machine learning fundamentals.",
      status: "PUBLISHED",
    },
  })

  const c2m1 = await prisma.module.create({
    data: {
      courseId: course2.id,
      title: "Python Fundamentals",
      description: "Core Python concepts for data science",
      order: 0,
    },
  })

  await Promise.all([
    prisma.lesson.create({
      data: {
        moduleId: c2m1.id,
        title: "Python Setup and Syntax",
        order: 0,
        contentType: "TEXT",
        contentBody: [
          { type: "heading", level: 1, content: "Getting Started with Python" },
          {
            type: "text",
            content:
              "Python is a versatile, high-level programming language known for its readability and extensive library ecosystem.",
          },
          {
            type: "code",
            language: "python",
            content:
              '# Variables and types\nname = "Data Scientist"\nage = 30\nsalary = 95000.50\nis_employed = True\n\nprint(f"Hello, {name}!")',
          },
        ],
      },
    }),
    prisma.lesson.create({
      data: {
        moduleId: c2m1.id,
        title: "Lists, Tuples, and Dictionaries",
        order: 1,
        contentType: "TEXT",
        contentBody: [
          { type: "heading", level: 1, content: "Python Data Structures" },
          {
            type: "text",
            content:
              "Python provides several built-in data structures: lists (mutable sequences), tuples (immutable sequences), and dictionaries (key-value pairs).",
          },
          {
            type: "code",
            language: "python",
            content:
              'fruits = ["apple", "banana", "cherry"]\ncoordinates = (10, 20)\nstudent = {"name": "Alice", "grade": "A", "score": 95}',
          },
        ],
      },
    }),
    prisma.lesson.create({
      data: {
        moduleId: c2m1.id,
        title: "Control Flow and Functions",
        order: 2,
        contentType: "TEXT",
        contentBody: [
          { type: "heading", level: 1, content: "Control Flow" },
          {
            type: "text",
            content:
              "Python uses indentation to define code blocks. Common control flow structures include if/elif/else, for loops, and while loops.",
          },
          {
            type: "code",
            language: "python",
            content:
              'def calculate_average(numbers):\n    if not numbers:\n        return 0\n    return sum(numbers) / len(numbers)\n\nscores = [85, 92, 78, 90, 88]\navg = calculate_average(scores)\nprint(f"Average: {avg}")',
          },
        ],
      },
    }),
  ])

  await prisma.quiz.create({
    data: {
      moduleId: c2m1.id,
      title: "Python Fundamentals Quiz",
      passingScore: 70,
      questions: {
        create: [
          {
            text: "Which of the following is a mutable data structure in Python?",
            type: "MCQ",
            options: ["Tuple", "String", "List", "Integer"],
            correctAnswer: "List",
          },
          {
            text: "Python uses curly braces to define code blocks.",
            type: "TRUEFALSE",
            options: ["True", "False"],
            correctAnswer: "False",
            explanation: "Python uses indentation to define code blocks.",
          },
          {
            text: "What is the output of len([1, 2, 3])?",
            type: "MCQ",
            options: ["2", "3", "4", "1"],
            correctAnswer: "3",
          },
        ],
      },
    },
  })

  const c2m2 = await prisma.module.create({
    data: {
      courseId: course2.id,
      title: "NumPy and Pandas",
      description: "Data manipulation with Python libraries",
      order: 1,
    },
  })

  await Promise.all([
    prisma.lesson.create({
      data: {
        moduleId: c2m2.id,
        title: "NumPy Arrays",
        order: 0,
        contentType: "TEXT",
        contentBody: [
          { type: "heading", level: 1, content: "NumPy Arrays" },
          {
            type: "text",
            content:
              "NumPy is the fundamental package for numerical computing in Python. Its main object is the ndarray, a multi-dimensional array.",
          },
          {
            type: "code",
            language: "python",
            content:
              "import numpy as np\n\narr = np.array([1, 2, 3, 4, 5])\nprint(arr.mean())  # 3.0\nprint(arr.std())   # 1.414...",
          },
        ],
      },
    }),
    prisma.lesson.create({
      data: {
        moduleId: c2m2.id,
        title: "Pandas DataFrames",
        order: 1,
        contentType: "TEXT",
        contentBody: [
          { type: "heading", level: 1, content: "Pandas DataFrames" },
          {
            type: "text",
            content:
              "Pandas provides the DataFrame, a 2-dimensional labeled data structure, perfect for data analysis tasks.",
          },
          {
            type: "code",
            language: "python",
            content:
              "import pandas as pd\n\ndf = pd.DataFrame({\n    'Name': ['Alice', 'Bob', 'Charlie'],\n    'Score': [92, 85, 78]\n})\nprint(df.describe())",
          },
        ],
      },
    }),
    prisma.lesson.create({
      data: {
        moduleId: c2m2.id,
        title: "Data Cleaning Techniques",
        order: 2,
        contentType: "TEXT",
        contentBody: [
          { type: "heading", level: 1, content: "Data Cleaning" },
          {
            type: "text",
            content:
              "Data cleaning is a critical step in any data analysis pipeline. Common tasks include handling missing values, removing duplicates, and correcting data types.",
          },
          {
            type: "code",
            language: "python",
            content:
              "# Handle missing values\ndf.fillna(0, inplace=True)\n\n# Remove duplicates\ndf.drop_duplicates(inplace=True)\n\n# Convert types\ndf['date'] = pd.to_datetime(df['date'])",
          },
        ],
      },
    }),
  ])

  await prisma.quiz.create({
    data: {
      moduleId: c2m2.id,
      title: "NumPy and Pandas Quiz",
      passingScore: 70,
      questions: {
        create: [
          {
            text: "What is the main data structure in Pandas for tabular data?",
            type: "MCQ",
            options: ["Array", "DataFrame", "Series", "Matrix"],
            correctAnswer: "DataFrame",
          },
          {
            text: "NumPy arrays can only store elements of the same type.",
            type: "TRUEFALSE",
            options: ["True", "False"],
            correctAnswer: "True",
          },
          {
            text: "Which method fills missing values in a Pandas DataFrame?",
            type: "MCQ",
            options: ["fill()", "fillna()", "replace_na()", "fill_missing()"],
            correctAnswer: "fillna()",
          },
        ],
      },
    },
  })

  const c2m3 = await prisma.module.create({
    data: {
      courseId: course2.id,
      title: "Data Visualization",
      description: "Create compelling visualizations with Python",
      order: 2,
    },
  })

  await Promise.all([
    prisma.lesson.create({
      data: {
        moduleId: c2m3.id,
        title: "Matplotlib Basics",
        order: 0,
        contentType: "TEXT",
        contentBody: [
          { type: "heading", level: 1, content: "Matplotlib" },
          {
            type: "text",
            content:
              "Matplotlib is the most widely used plotting library in Python. It provides a MATLAB-like interface for creating static, animated, and interactive plots.",
          },
        ],
      },
    }),
    prisma.lesson.create({
      data: {
        moduleId: c2m3.id,
        title: "Seaborn for Statistical Plots",
        order: 1,
        contentType: "TEXT",
        contentBody: [
          { type: "heading", level: 1, content: "Seaborn" },
          {
            type: "text",
            content:
              "Seaborn is built on top of Matplotlib and provides a high-level interface for drawing attractive statistical graphics.",
          },
        ],
      },
    }),
    prisma.lesson.create({
      data: {
        moduleId: c2m3.id,
        title: "Interactive Dashboards",
        order: 2,
        contentType: "TEXT",
        contentBody: [
          { type: "heading", level: 1, content: "Interactive Dashboards" },
          {
            type: "text",
            content:
              "Libraries like Plotly and Dash allow you to create interactive, web-based visualizations and dashboards from Python.",
          },
        ],
      },
    }),
  ])

  await prisma.quiz.create({
    data: {
      moduleId: c2m3.id,
      title: "Data Visualization Quiz",
      passingScore: 70,
      questions: {
        create: [
          {
            text: "Which library provides the foundation for most Python plotting?",
            type: "MCQ",
            options: ["Seaborn", "Plotly", "Matplotlib", "Bokeh"],
            correctAnswer: "Matplotlib",
          },
          {
            text: "Seaborn is built on top of Matplotlib.",
            type: "TRUEFALSE",
            options: ["True", "False"],
            correctAnswer: "True",
          },
          {
            text: "Which library is commonly used for interactive web-based dashboards?",
            type: "MCQ",
            options: ["Matplotlib", "Seaborn", "Dash", "ggplot"],
            correctAnswer: "Dash",
          },
        ],
      },
    },
  })

  // Course 3: UI/UX Design Principles (DRAFT)
  const course3 = await prisma.course.create({
    data: {
      title: "UI/UX Design Principles",
      slug: "ui-ux-design",
      description:
        "Understand the core principles of user interface and user experience design. Learn to create intuitive, accessible, and beautiful digital products.",
      status: "DRAFT",
    },
  })

  const c3m1 = await prisma.module.create({
    data: {
      courseId: course3.id,
      title: "Design Thinking",
      description: "The human-centered approach to design",
      order: 0,
    },
  })

  await Promise.all([
    prisma.lesson.create({
      data: {
        moduleId: c3m1.id,
        title: "What is Design Thinking?",
        order: 0,
        contentType: "TEXT",
        contentBody: [
          { type: "heading", level: 1, content: "Design Thinking" },
          {
            type: "text",
            content:
              "Design thinking is a human-centered approach to innovation that draws from the designer's toolkit to integrate the needs of people, the possibilities of technology, and the requirements for business success.",
          },
        ],
      },
    }),
    prisma.lesson.create({
      data: {
        moduleId: c3m1.id,
        title: "Empathy and User Research",
        order: 1,
        contentType: "TEXT",
        contentBody: [
          { type: "heading", level: 1, content: "Empathy in Design" },
          {
            type: "text",
            content:
              "Empathy is the foundation of design thinking. Understanding your users' needs, motivations, and pain points is essential for creating meaningful experiences.",
          },
        ],
      },
    }),
    prisma.lesson.create({
      data: {
        moduleId: c3m1.id,
        title: "Ideation and Prototyping",
        order: 2,
        contentType: "TEXT",
        contentBody: [
          { type: "heading", level: 1, content: "Ideation and Prototyping" },
          {
            type: "text",
            content:
              "Ideation is the process of generating a broad set of ideas. Prototyping turns those ideas into tangible representations that can be tested with users.",
          },
        ],
      },
    }),
    prisma.lesson.create({
      data: {
        moduleId: c3m1.id,
        title: "Testing and Iteration",
        order: 3,
        contentType: "TEXT",
        contentBody: [
          { type: "heading", level: 1, content: "Testing and Iteration" },
          {
            type: "text",
            content:
              "Testing with real users provides invaluable feedback. Iteration means refining your designs based on what you learn from testing.",
          },
        ],
      },
    }),
  ])

  await prisma.quiz.create({
    data: {
      moduleId: c3m1.id,
      title: "Design Thinking Quiz",
      passingScore: 70,
      questions: {
        create: [
          {
            text: "What is the first phase of design thinking?",
            type: "MCQ",
            options: ["Define", "Empathize", "Ideate", "Prototype"],
            correctAnswer: "Empathize",
          },
          {
            text: "Design thinking is a technology-centered approach.",
            type: "TRUEFALSE",
            options: ["True", "False"],
            correctAnswer: "False",
            explanation:
              "Design thinking is a human-centered approach, not technology-centered.",
          },
          {
            text: "What is the purpose of prototyping?",
            type: "MCQ",
            options: [
              "To create the final product",
              "To test ideas quickly with tangible representations",
              "To write documentation",
              "To train developers",
            ],
            correctAnswer:
              "To test ideas quickly with tangible representations",
          },
        ],
      },
    },
  })

  const c3m2 = await prisma.module.create({
    data: {
      courseId: course3.id,
      title: "Visual Design",
      description: "Color, typography, and layout principles",
      order: 1,
    },
  })

  await Promise.all([
    prisma.lesson.create({
      data: {
        moduleId: c3m2.id,
        title: "Color Theory",
        order: 0,
        contentType: "TEXT",
        contentBody: [
          { type: "heading", level: 1, content: "Color Theory for UI" },
          {
            type: "text",
            content:
              "Color is one of the most powerful tools in a designer's arsenal. Understanding color theory helps you create harmonious, accessible, and emotionally resonant interfaces.",
          },
        ],
      },
    }),
    prisma.lesson.create({
      data: {
        moduleId: c3m2.id,
        title: "Typography",
        order: 1,
        contentType: "TEXT",
        contentBody: [
          { type: "heading", level: 1, content: "Typography in UI Design" },
          {
            type: "text",
            content:
              "Good typography improves readability, establishes hierarchy, and conveys brand personality. Choose fonts that are legible and appropriate for your audience.",
          },
        ],
      },
    }),
    prisma.lesson.create({
      data: {
        moduleId: c3m2.id,
        title: "Layout and Grid Systems",
        order: 2,
        contentType: "TEXT",
        contentBody: [
          { type: "heading", level: 1, content: "Layout and Grids" },
          {
            type: "text",
            content:
              "Grid systems provide structure and consistency to your layouts. They help align elements and create visual rhythm across your designs.",
          },
        ],
      },
    }),
  ])

  await prisma.quiz.create({
    data: {
      moduleId: c3m2.id,
      title: "Visual Design Quiz",
      passingScore: 70,
      questions: {
        create: [
          {
            text: "Which color model is used for digital screens?",
            type: "MCQ",
            options: ["CMYK", "RGB", "Pantone", "HSL"],
            correctAnswer: "RGB",
          },
          {
            text: "Sans-serif fonts are generally considered more readable on screens.",
            type: "TRUEFALSE",
            options: ["True", "False"],
            correctAnswer: "True",
          },
          {
            text: "What is the primary purpose of a grid system in UI design?",
            type: "MCQ",
            options: [
              "To add decoration",
              "To provide structure and consistency",
              "To increase file size",
              "To limit creativity",
            ],
            correctAnswer: "To provide structure and consistency",
          },
        ],
      },
    },
  })

  const c3m3 = await prisma.module.create({
    data: {
      courseId: course3.id,
      title: "Accessibility",
      description: "Design for everyone",
      order: 2,
    },
  })

  await Promise.all([
    prisma.lesson.create({
      data: {
        moduleId: c3m3.id,
        title: "Why Accessibility Matters",
        order: 0,
        contentType: "TEXT",
        contentBody: [
          { type: "heading", level: 1, content: "Accessibility" },
          {
            type: "text",
            content:
              "Accessible design ensures that products can be used by people with diverse abilities. It is both an ethical responsibility and often a legal requirement.",
          },
        ],
      },
    }),
    prisma.lesson.create({
      data: {
        moduleId: c3m3.id,
        title: "WCAG Guidelines",
        order: 1,
        contentType: "TEXT",
        contentBody: [
          { type: "heading", level: 1, content: "WCAG Guidelines" },
          {
            type: "text",
            content:
              "The Web Content Accessibility Guidelines (WCAG) provide a framework of principles: Perceivable, Operable, Understandable, and Robust (POUR).",
          },
        ],
      },
    }),
    prisma.lesson.create({
      data: {
        moduleId: c3m3.id,
        title: "Accessible Components",
        order: 2,
        contentType: "TEXT",
        contentBody: [
          { type: "heading", level: 1, content: "Building Accessible Components" },
          {
            type: "text",
            content:
              "Accessible components use proper ARIA attributes, keyboard navigation, sufficient color contrast, and clear focus indicators.",
          },
        ],
      },
    }),
  ])

  await prisma.quiz.create({
    data: {
      moduleId: c3m3.id,
      title: "Accessibility Quiz",
      passingScore: 70,
      questions: {
        create: [
          {
            text: "What does WCAG stand for?",
            type: "MCQ",
            options: [
              "Web Content Accessibility Guidelines",
              "Web Code Access Guide",
              "Website Content and Graphics",
              "Web Compliance Assessment Guide",
            ],
            correctAnswer: "Web Content Accessibility Guidelines",
          },
          {
            text: "Color alone should be sufficient to convey information in an accessible design.",
            type: "TRUEFALSE",
            options: ["True", "False"],
            correctAnswer: "False",
            explanation:
              "Color alone should not be the only means of conveying information, as color-blind users may not perceive the difference.",
          },
          {
            text: "What is the minimum contrast ratio for normal text per WCAG AA?",
            type: "MCQ",
            options: ["2:1", "3:1", "4.5:1", "7:1"],
            correctAnswer: "4.5:1",
          },
        ],
      },
    },
  })

  // Enroll learner in courses 1 and 2
  await prisma.enrollment.create({
    data: {
      userId: learner.id,
      courseId: course1.id,
    },
  })

  await prisma.enrollment.create({
    data: {
      userId: learner.id,
      courseId: course2.id,
    },
  })

  // Mark some progress for the learner in course 1 (all lessons complete)
  for (const lesson of c1m1Lessons) {
    await prisma.progress.create({
      data: {
        userId: learner.id,
        lessonId: lesson.id,
        completed: true,
        completedAt: new Date(),
      },
    })
  }

  // Get all lessons for course 1 to mark remaining as complete
  const allCourse1Lessons = await prisma.lesson.findMany({
    where: { module: { courseId: course1.id } },
  })

  for (const lesson of allCourse1Lessons) {
    await prisma.progress.upsert({
      where: { userId_lessonId: { userId: learner.id, lessonId: lesson.id } },
      update: { completed: true, completedAt: new Date() },
      create: {
        userId: learner.id,
        lessonId: lesson.id,
        completed: true,
        completedAt: new Date(),
      },
    })
  }

  // Complete enrollment for course 1
  await prisma.enrollment.update({
    where: {
      userId_courseId: { userId: learner.id, courseId: course1.id },
    },
    data: { completedAt: new Date() },
  })

  // Issue certificate for course 1
  await prisma.certificate.create({
    data: {
      userId: learner.id,
      courseId: course1.id,
    },
  })

  // Mark partial progress for course 2 (first module only)
  const course2FirstModuleLessons = await prisma.lesson.findMany({
    where: { moduleId: c2m1.id },
  })

  for (const lesson of course2FirstModuleLessons) {
    await prisma.progress.create({
      data: {
        userId: learner.id,
        lessonId: lesson.id,
        completed: true,
        completedAt: new Date(),
      },
    })
  }

  console.log("Seeding complete!")
  console.log("Admin: admin@aokare.com / password123")
  console.log("Learner: learner@aokare.com / password123")
  console.log(`Courses created: ${course1.title}, ${course2.title}, ${course3.title}`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
