// loadTemplates.js
async function loadComponent(elementId, filePath, templateId) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`Failed to load ${filePath}`);

        const htmlText = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");

        const template = doc.getElementById(templateId);

        if (!template) {
            throw new Error(`Template ${templateId} not found in ${filePath}`);
        }

        const clone = template.content.cloneNode(true);
        document.getElementById(elementId).appendChild(clone);

    } catch (error) {
        console.error(error);
    }
}

/* ---- SUBMISSION PAGE LOGIC ---- */
function initSubmissionForm() {
    // Set today's date as default
    const dateInput = document.getElementById('submitDate');
    if (dateInput) dateInput.valueAsDate = new Date();

    const submissionForm = document.getElementById('submissionForm');
    if (submissionForm) {
        submissionForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const submitBtn = e.target.querySelector('.submit-button');
            submitBtn.disabled = true;
            submitBtn.innerText = 'Processing...';

            const docType = document.getElementById('docType').value;
            const postTitle = document.getElementById('postTitle').value;
            const submitDate = document.getElementById('submitDate').value;

            const fileEntries = document.querySelectorAll('.file-entry');
            let filesData = [];

            try {
                for (let entry of fileEntries) {
                    const title = entry.querySelector('.file-title').value;
                    const fileInput = entry.querySelector('.file-upload');

                    if (fileInput.files.length > 0) {
                        const file = fileInput.files[0];

                        // Read file as Base64 so it can be downloaded later
                        const base64Data = await new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result);
                            reader.onerror = reject;
                            reader.readAsDataURL(file);
                        });

                        filesData.push({
                            title: title,
                            fileName: file.name,
                            size: (file.size / 1024).toFixed(2) + ' KB',
                            dataURL: base64Data
                        });
                    }
                }

                const newSubmission = {
                    id: Date.now(),
                    docType: docType,
                    postTitle: postTitle,
                    submitDate: submitDate,
                    files: filesData
                };

                // Get existing submissions
                let submissions = JSON.parse(localStorage.getItem('ica2s_submissions')) || [];
                submissions.push(newSubmission);

                // Save back with error handling for large files (LocalStorage 5MB limit)
                try {
                    localStorage.setItem('ica2s_submissions', JSON.stringify(submissions));

                    const msgDiv = document.getElementById('formMessage');
                    msgDiv.style.color = "green";
                    msgDiv.innerText = "Submission successful! Redirecting...";

                    setTimeout(() => {
                        window.location.href = 'submissions-list.html';
                    }, 1000);
                } catch (quotaError) {
                    alert("Submission failed: File is too large for the browser's local sandbox (5MB limit). Since there is no actual database attached to this static site, try uploading a much smaller file to test the download feature.");
                    submitBtn.disabled = false;
                    submitBtn.innerText = 'Submit Paper';
                }
            } catch (readError) {
                alert("Error reading file.");
                submitBtn.disabled = false;
                submitBtn.innerText = 'Submit Paper';
            }
        });
    }
}

// Word limit function
window.limitWords = function (inputElem, maxWords) {
    let words = inputElem.value.trim().split(/\s+/);
    if (words[0] === "") words = [];

    if (words.length > maxWords) {
        inputElem.value = words.slice(0, maxWords).join(" ") + " ";
        words = words.slice(0, maxWords);
    }

    let counterId = inputElem.id === 'postTitle' ? 'titleWordCount' : '';
    if (counterId) {
        const counterElem = document.getElementById(counterId);
        if (counterElem) counterElem.innerText = `${words.length} / ${maxWords} words`;
    }
};

window.addFileEntry = function () {
    const container = document.getElementById('fileEntriesContainer');
    if (!container) return;
    const entryDiv = document.createElement('div');
    entryDiv.className = 'form-group file-entry';

    entryDiv.innerHTML = `
        <label>File Name / Title (Max 20 words)</label>
        <input type="text" class="file-title" required placeholder="Enter file title" oninput="limitWords(this, 20)">
        <label style="margin-top:10px;">Select File</label>
        <input type="file" class="file-upload" required accept=".pdf,.doc,.docx,.zip,.png,.jpg,.jpeg">
        <button type="button" class="remove-file-btn" onclick="this.parentElement.remove()">Remove</button>
    `;
    container.appendChild(entryDiv);
};

/* ---- SUBMISSIONS LIST LOGIC ---- */
function initSubmissionsList() {

    const tableBody = document.getElementById("tableBody");
    if (!tableBody) return;

    // Fetch and sort submissions (newest first)
    let submissions = JSON.parse(localStorage.getItem('ica2s_submissions')) || [];
    submissions.sort((a, b) => new Date(b.submitDate) - new Date(a.submitDate));

    if (submissions.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="empty-message">No submissions found. <a href="submission.html" style="color:var(--primary-blue)">Submit a paper</a></td></tr>`;
        return;
    }

    submissions.forEach((sub, index) => {
        const tr = document.createElement("tr");

        // S.No.
        const tdSno = document.createElement("td");
        tdSno.innerText = index + 1;
        tdSno.style.fontWeight = "bold";

        // Post Title
        const tdTitle = document.createElement("td");
        tdTitle.innerHTML = `<strong>${sub.postTitle}</strong><br><small style="color:gray;">${sub.docType}</small>`;

        // Date 
        const tdDate = document.createElement("td");
        const dateObj = new Date(sub.submitDate);
        tdDate.innerText = dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

        // Files
        const tdFiles = document.createElement("td");

        if (sub.files && sub.files.length > 0) {
            const ul = document.createElement("ul");
            ul.className = "file-list";

            sub.files.forEach(file => {
                const li = document.createElement("li");

                const linkHref = file.dataURL ? file.dataURL : '#';
                const linkAction = file.dataURL ? `download="${file.fileName}"` : `onclick="alert('This file is from an earlier test and has no data attached. Submit a new one!'); return false;"`;

                li.innerHTML = `
                    <strong>Title:</strong> ${file.title}<br>
                    <small><em>File: ${file.fileName} (${file.size})</em></small><br>
                    <a href="${linkHref}" ${linkAction} class="download-btn">⬇ Download File</a>
                `;
                ul.appendChild(li);
            });
            tdFiles.appendChild(ul);
        } else {
            tdFiles.innerText = "No files attached.";
        }

        tr.appendChild(tdSno);
        tr.appendChild(tdTitle);
        tr.appendChild(tdDate);
        tr.appendChild(tdFiles);

        tableBody.appendChild(tr);
    });
}
document.addEventListener("DOMContentLoaded", async function () {
    console.log("Loading components...");

    await loadComponent("navbar-placeholder", "navbar.html", "navbar-template");
    await loadComponent("footer-placeholder", "footer.html", "footer-template");

    initialize();

    // Call new page-specific logic
    initSubmissionForm();
    initSubmissionsList();
});

function initialize() {


    // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Highlight active nav link
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        if (linkPath === currentPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Close menu when clicking on a link (mobile)
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }

    // Navigation scroll behavior
    const navbar = document.getElementById('navbar');

    if (navbar) {
        // Add scrolled class to navbar on scroll
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    // Contact form submission
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Get form values
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const message = document.getElementById('message').value;

            // Simple validation
            if (name && email && message) {
                alert(`Thank you, ${name}! Your message has been received. We'll get back to you at ${email} soon.`);
                contactForm.reset();
            }
        });
    }

    // Intersection Observer for animation on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe all cards and animated elements
    document.querySelectorAll('.theme-card, .committee-card, .registration-card, .stat-card, .timeline-item').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // Registration button interactions
    const registerButtons = document.querySelectorAll('.register-button');
    registerButtons.forEach(button => {
        button.addEventListener('click', () => {
            const cardType = button.closest('.registration-card').querySelector('.registration-type').textContent;
            alert(`Registration for ${cardType} type selected! You would be redirected to the payment portal.`);
        });
    });

    // CTA button smooth scroll
    document.querySelectorAll('.cta-button').forEach(button => {
        button.addEventListener('click', (e) => {
            if (button.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                const targetId = button.getAttribute('href');
                const targetSection = document.querySelector(targetId);

                if (targetSection) {
                    targetSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });

}


