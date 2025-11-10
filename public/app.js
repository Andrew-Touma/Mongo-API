document.addEventListener('DOMContentLoaded', async () => {
    const coursesList = document.getElementById('courses-list');
    const addCourseForm = document.getElementById('add-course-form');
    const studentsList = document.getElementById('students-list');
    const addStudentForm = document.getElementById('add-student-form');

    let API_URL = '';

    try {
        const configResponse = await fetch('/api/config');
        const config = await configResponse.json();
        API_URL = `http://localhost:${config.port}/api`;
    } catch (error) {
        console.error('Error fetching API config:', error);
        API_URL = 'http://localhost:3000/api';
    }

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
                    <button onclick="deleteCourse('${course._id}')">Delete</button>
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
                    <button onclick="deleteStudent('${student._id}')">Delete</button>
                    <button onclick="showStudentDetails('${student._id}')">View Details</button>
                `;
                studentsList.appendChild(studentItem);
            });
        } catch (error) {
            console.error('Error fetching students:', error);
        }
    }

    window.showStudentDetails = async (id) => {
        try {
            const [studentResponse, coursesResponse] = await Promise.all([
                fetch(`${API_URL}/students/${id}`),
                fetch(`${API_URL}/courses`)
            ]);
            const student = await studentResponse.json();
            const courses = await coursesResponse.json();
            
            const studentItem = document.querySelector(`.student-item button[onclick="showStudentDetails('${id}')"]`).parentElement;
            
            let detailsDiv = studentItem.querySelector('.student-details');
            if (detailsDiv) {
                detailsDiv.remove();
                return;
            }

            detailsDiv = document.createElement('div');
            detailsDiv.className = 'student-details';

            const registeredCourses = student.registeredCourses || [];
            const availableCourses = courses.filter(course => !registeredCourses.some(rc => rc.courseId === course._id));

            let detailsHTML = '<h5>Registered Courses:</h5>';
            if (registeredCourses.length > 0) {
                detailsHTML += '<ul>';
                registeredCourses.forEach(rc => {
                    detailsHTML += `<li>${rc.title} (${rc.code}) <button onclick="unregisterCourse('${student._id}', '${rc.courseId}')">Unregister</button></li>`;
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
                detailsHTML += `<button onclick="registerCourse('${student._id}')">Register</button>`;
            } else {
                detailsHTML += '<p>No courses available to register.</p>';
            }

            detailsDiv.innerHTML = detailsHTML;
            studentItem.appendChild(detailsDiv);

        } catch (error) {
            console.error('Error fetching student details:', error);
        }
    };

    window.registerCourse = async (studentId) => {
        const courseId = document.getElementById(`course-select-${studentId}`).value;
        try {
            await fetch(`${API_URL}/students/${studentId}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ courseId })
            });
            showStudentDetails(studentId);
        } catch (error) {
            console.error('Error registering course:', error);
        }
    };

    window.unregisterCourse = async (studentId, courseId) => {
        try {
            await fetch(`${API_URL}/students/${studentId}/unregister`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ courseId })
            });
            showStudentDetails(studentId);
        } catch (error) {
            console.error('Error unregistering course:', error);
        }
    };

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

    window.deleteCourse = async (id) => {
        try {
            await fetch(`${API_URL}/courses/${id}`, { method: 'DELETE' });
            fetchCourses();
            fetchStudents(); 
        } catch (error) {
            console.error('Error deleting course:', error);
        }
    };

    window.deleteStudent = async (id) => {
        try {
            await fetch(`${API_URL}/students/${id}`, { method: 'DELETE' });
            fetchStudents();
        } catch (error) {
            console.error('Error deleting student:', error);
        }
    };

    fetchCourses();
    fetchStudents();
});
