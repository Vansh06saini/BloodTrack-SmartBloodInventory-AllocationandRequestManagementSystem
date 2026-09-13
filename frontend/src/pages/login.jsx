import LoginForm from "../components/loginform";

function Login() {
    return (
        <main className="login-page">
            <section className="login-container">
                <div className="login-intro">
                    <div className="brand">
                        <h1>Smart Blood</h1>
                        <p>Inventory Management System</p>
                    </div>

                    <div className="intro-content">
                        <h2>Manage blood inventory with confidence.</h2>
                        <p>
                            A centralized system for hospitals and blood bank staff to
                            manage blood requests, inventory, allocations, alerts, and
                            demand forecasts.
                        </p>
                    </div>
                </div>

                <div className="login-panel">
                    <LoginForm />
                </div>
            </section>
        </main>
    );
}

export default Login;