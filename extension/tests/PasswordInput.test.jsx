import { render, screen, fireEvent } from '@testing-library/react';
import PasswordInput from '../src/components/PasswordInput';
import { describe, it, expect, vi } from 'vitest';

describe('PasswordInput Component', () => {
  it('renders correctly with given props', () => {
    render(<PasswordInput id="pwd" label="Mật khẩu" value="" onChange={() => {}} />);
    
    expect(screen.getByLabelText('Mật khẩu')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('type', 'password');
  });

  it('toggles password visibility when the eye button is clicked', () => {
    render(<PasswordInput id="pwd" label="Mật khẩu" value="mysecret" onChange={() => {}} />);
    
    const input = screen.getByLabelText('Mật khẩu');
    const toggleButton = screen.getByRole('button', { name: /hiện mật khẩu/i });

    // Initially should be password
    expect(input).toHaveAttribute('type', 'password');

    // Click to show
    fireEvent.click(toggleButton);
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /ẩn mật khẩu/i })).toBeInTheDocument();

    // Click to hide
    fireEvent.click(screen.getByRole('button', { name: /ẩn mật khẩu/i }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('calls onChange callback when user types', () => {
    const handleChange = vi.fn();
    render(<PasswordInput id="pwd" label="Mật khẩu" value="" onChange={handleChange} />);
    
    const input = screen.getByLabelText('Mật khẩu');
    fireEvent.change(input, { target: { value: 'newpassword' } });
    
    expect(handleChange).toHaveBeenCalledWith('newpassword');
  });

  it('displays error message if provided', () => {
    render(<PasswordInput id="pwd" label="Mật khẩu" value="" onChange={() => {}} error="Mật khẩu quá yếu" />);
    
    expect(screen.getByText('Mật khẩu quá yếu')).toBeInTheDocument();
  });
});
