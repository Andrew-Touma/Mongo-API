document.addEventListener('DOMContentLoaded', async () => {
    const coursesList = document.getElementById('courses-list');
    const addCourseForm = document.getElementById('add-course-form');
    const studentsList = document.getElementById('students-list');
    const addStudentForm = document.getElementById('add-student-form');

    let API_URL = 'https://mongoapi-leap.onrender.com/api';

    const showCoursesButton = document.getElementById('show-courses');
    const showStudentsButton = document.getElementById('show-students');

    showCoursesButton.addEventListener('click', fetchCourses);
    showStudentsButton.addEventListener('click', fetchStudents);

    async function fetchCourses() {
        try {
            const response = await fetch(`${API_URL}/courses`);
            const courses = await response.json();
            coursesList.innerHTML = '';
            courses.forEach(course => {
                const courseItem = document.createElement('div');
                courseItem.className = 'course-item';
                courseItem.innerHTML = `
                    <h4>${course.title}</h4>
                    <p>${course.code}</p>
                    <button data-action="delete" data-course-id="${course._id}">Delete</button>
                `;
                coursesList.appendChild(courseItem);
            });
        } catch (error) {
            console.error('Error fetching courses:', error);
        }
    }

    async function fetchStudents() {
        try {
            const response = await fetch(`${API_URL}/students`);
            const students = await response.json();
            studentsList.innerHTML = '';
            students.forEach(student => {
                const studentItem = document.createElement('div');
                studentItem.className = 'student-item';
                studentItem.innerHTML = `
                    <h4>${student.name}</h4>
                    <p>${student.email || 'No email'}</p>
                    <button data-action="delete" data-student-id="${student._id}">Delete</button>
                    <button data-action="details" data-student-id="${student._id}">View Details</button>
                `;
                studentsList.appendChild(studentItem);
            });
        } catch (error) {
            console.error('Error fetching students:', error);
        }
    }

    async function showStudentDetails(id, studentItem) {
        try {
            let detailsDiv = studentItem.querySelector('.student-details');
            if (detailsDiv) {
                detailsDiv.remove();
                return;
            }

            const [studentResponse, coursesResponse] = await Promise.all([
                fetch(`${API_URL}/students/${id}`),
                fetch(`${API_URL}/courses`)
            ]);
            const student = await studentResponse.json();
            const courses = await coursesResponse.json();
            
            detailsDiv = document.createElement('div');
            detailsDiv.className = 'student-details';

            const registeredCourses = student.registeredCourses || [];
            const availableCourses = courses.filter(course => !registeredCourses.some(rc => rc.courseId === course._id));

            let detailsHTML = '<h5>Registered Courses:</h5>';
            if (registeredCourses.length > 0) {
                detailsHTML += '<ul>';
                registeredCourses.forEach(rc => {
                    detailsHTML += `<li>${rc.title} (${rc.code}) <button data-action="unregister" data-student-id="${student._id}" data-course-id="${rc.courseId}">Unregister</button></li>`;
                });
                detailsHTML += '</ul>';
            } else {
                detailsHTML += '<p>No registered courses.</p>';
            }

            detailsHTML += '<h5>Register for a Course:</h5>';
            if (availableCourses.length > 0) {
                detailsHTML += `<select id="course-select-${student._id}">`;
                availableCourses.forEach(course => {
                    detailsHTML += `<option value="${course._id}">${course.title}</option>`;
                });
                detailsHTML += `</select>`;
                detailsHTML += `<button data-action="register" data-student-id="${student._id}">Register</button>`;
            } else {
                detailsHTML += '<p>No courses available to register.</p>';
            }

            detailsDiv.innerHTML = detailsHTML;
            studentItem.appendChild(detailsDiv);

        } catch (error) {
            console.error('Error fetching student details:', error);
        }
    }

    async function registerCourse(studentId) {
        const courseId = document.getElementById(`course-select-${studentId}`).value;
        try {
            await fetch(`${API_URL}/students/${studentId}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ courseId })
            });
            const studentItem = document.querySelector(`.student-item button[data-student-id="${studentId}"]`).parentElement;
            showStudentDetails(studentId, studentItem);
        } catch (error) {
            console.error('Error registering course:', error);
        }
    }

    async function unregisterCourse(studentId, courseId) {
        try {
            await fetch(`${API_URL}/students/${studentId}/unregister`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ courseId })
            });
            const studentItem = document.querySelector(`.student-item button[data-student-id="${studentId}"]`).parentElement;
            showStudentDetails(studentId, studentItem);
        } catch (error) {
            console.error('Error unregistering course:', error);
        }
    }

    async function deleteCourse(id) {
        try {
            await fetch(`${API_URL}/courses/${id}`, { method: 'DELETE' });
            fetchCourses();
            fetchStudents(); 
        } catch (error) {
            console.error('Error deleting course:', error);
        }
    }

    async function deleteStudent(id) {
        try {
            await fetch(`${API_URL}/students/${id}`, { method: 'DELETE' });
            fetchStudents();
        } catch (error) {
            console.error('Error deleting student:', error);
        }
    }

    coursesList.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const action = e.target.dataset.action;
            if (action === 'delete') {
                const courseId = e.target.dataset.courseId;
                deleteCourse(courseId);
            }
        }
    });

    studentsList.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const action = e.target.dataset.action;
            const studentId = e.target.dataset.studentId;
            const courseId = e.target.dataset.courseId;

            if (action === 'delete') {
                deleteStudent(studentId);
            } else if (action === 'details') {
                const studentItem = e.target.parentElement;
                showStudentDetails(studentId, studentItem);
            } else if (action === 'register') {
                registerCourse(studentId);
            } else if (action === 'unregister') {
                unregisterCourse(studentId, courseId);
            }
        }
    });

    addCourseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('course-title').value;
        const code = document.getElementById('course-code').value;
        try {
            await fetch(`${API_URL}/courses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, code })
            });
            fetchCourses();
            addCourseForm.reset();
        } catch (error) {
            console.error('Error adding course:', error);
        }
    });

    addStudentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('student-name').value;
        const email = document.getElementById('student-email').value;
        try {
            await fetch(`${API_URL}/students`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email })
            });
            fetchStudents();
            addStudentForm.reset();
        } catch (error) {
            console.error('Error adding student:', error);
        }
    });

    fetchCourses();
    fetchStudents();
});
