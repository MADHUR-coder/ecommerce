document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('admin-login-form');
    const usernameInput = document.getElementById('admin-username');
    const passwordInput = document.getElementById('admin-password');
    const passwordToggle = document.getElementById('admin-password-toggle');
    const errorMessage = document.getElementById('admin-login-error');
    const submitButton = document.getElementById('admin-login-submit');
    const submitLabel = submitButton.querySelector('span');
    const spinner = submitButton.querySelector('.admin-spinner');

    const showError = (message) => {
        errorMessage.textContent = message;
        errorMessage.hidden = false;
    };

    const setLoading = (loading) => {
        submitButton.disabled = loading;
        submitLabel.textContent = loading ? 'Signing in…' : 'Sign in';
        spinner.hidden = !loading;
    };

    try {
        const response = await fetch('/api/admin/session', { credentials: 'same-origin' });
        if (!response.ok) throw new Error('Could not verify your session. Please reload and try again.');
        const session = await response.json();
        if (session.authenticated) window.location.replace('/admin.html');
    } catch (error) {
        showError(error.message || 'The admin service is unavailable. Start the project server and try again.');
    }

    passwordToggle.addEventListener('click', () => {
        const visible = passwordInput.type === 'password';
        passwordInput.type = visible ? 'text' : 'password';
        passwordToggle.textContent = visible ? 'Hide' : 'Show';
        passwordToggle.setAttribute('aria-label', `${visible ? 'Hide' : 'Show'} password`);
        passwordToggle.setAttribute('aria-pressed', String(visible));
        passwordInput.focus();
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorMessage.hidden = true;

        if (!usernameInput.value.trim() || !passwordInput.value) {
            showError('Enter your email or username and password.');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: usernameInput.value.trim(),
                    password: passwordInput.value
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Sign-in failed. Please try again.');
            window.location.replace('/admin.html');
        } catch (error) {
            showError(error.message || 'Could not reach the admin service. Please try again.');
            setLoading(false);
        }
    });
});
