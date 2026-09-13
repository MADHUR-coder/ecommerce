document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value;
            // Fake auth
            const user = {
                email: email,
                name: email.split('@')[0],
                token: 'dummy-token-' + Math.random().toString(36).substr(2)
            };

            localStorage.setItem('aura_user', JSON.stringify(user));
            showToast('Logged in successfully!');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const confirm = document.getElementById('reg-confirm').value;
            const errorText = document.getElementById('password-error');

            if (password !== confirm) {
                errorText.style.display = 'block';
                return;
            }

            errorText.style.display = 'none';

            // Fake Registration
            const user = {
                email: email,
                name: name,
                token: 'dummy-token-' + Math.random().toString(36).substr(2)
            };

            localStorage.setItem('aura_user', JSON.stringify(user));
            showToast('Account created successfully!');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        });
    }
});
