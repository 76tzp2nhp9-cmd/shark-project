import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login form', () => {
  render(<App />);
  const loginButton = screen.getByText('Sign In');
  expect(loginButton).toBeInTheDocument();
});
