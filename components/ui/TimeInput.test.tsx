import { render, screen, fireEvent } from '@testing-library/react';
import TimeInput from './TimeInput';

describe('TimeInput', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with label when provided', () => {
    render(<TimeInput {...defaultProps} label="Departure Time" />);
    expect(screen.getByText('Departure Time')).toBeInTheDocument();
  });

  it('shows required indicator when required prop is true', () => {
    render(<TimeInput {...defaultProps} label="Time" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('displays empty input when no value is provided', () => {
    render(<TimeInput {...defaultProps} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('');
  });

  it('displays 12-hour format time from 24-hour value', () => {
    render(<TimeInput {...defaultProps} value="14:30" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('2:30');
  });

  it('displays AM time correctly', () => {
    render(<TimeInput {...defaultProps} value="09:00" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('9:00');

    // AM button should be active
    const amButton = screen.getByRole('button', { name: 'AM' });
    expect(amButton).toHaveClass('bg-blue-600');
  });

  it('displays PM time correctly', () => {
    render(<TimeInput {...defaultProps} value="14:00" />);

    // PM button should be active
    const pmButton = screen.getByRole('button', { name: 'PM' });
    expect(pmButton).toHaveClass('bg-blue-600');
  });

  it('handles noon (12:00) correctly as PM', () => {
    render(<TimeInput {...defaultProps} value="12:00" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('12:00');

    const pmButton = screen.getByRole('button', { name: 'PM' });
    expect(pmButton).toHaveClass('bg-blue-600');
  });

  it('handles midnight (00:00) correctly as AM', () => {
    render(<TimeInput {...defaultProps} value="00:00" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('12:00');

    const amButton = screen.getByRole('button', { name: 'AM' });
    expect(amButton).toHaveClass('bg-blue-600');
  });

  it('calls onChange with 24-hour format on blur', () => {
    const onChange = jest.fn();
    render(<TimeInput {...defaultProps} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '3:30' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith('03:30');
  });

  it('parses shorthand input "330" as 3:30', () => {
    const onChange = jest.fn();
    render(<TimeInput {...defaultProps} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '330' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith('03:30');
  });

  it('parses input with "a" suffix as AM', () => {
    const onChange = jest.fn();
    render(<TimeInput {...defaultProps} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '930a' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith('09:30');
  });

  it('parses input with "p" suffix as PM', () => {
    const onChange = jest.fn();
    render(<TimeInput {...defaultProps} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '330p' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith('15:30');
  });

  it('toggles from AM to PM correctly', () => {
    const onChange = jest.fn();
    render(<TimeInput {...defaultProps} value="09:30" onChange={onChange} />);

    const pmButton = screen.getByRole('button', { name: 'PM' });
    fireEvent.click(pmButton);

    expect(onChange).toHaveBeenCalledWith('21:30');
  });

  it('toggles from PM to AM correctly', () => {
    const onChange = jest.fn();
    render(<TimeInput {...defaultProps} value="14:30" onChange={onChange} />);

    const amButton = screen.getByRole('button', { name: 'AM' });
    fireEvent.click(amButton);

    expect(onChange).toHaveBeenCalledWith('02:30');
  });

  it('handles noon toggle from PM to AM correctly', () => {
    const onChange = jest.fn();
    render(<TimeInput {...defaultProps} value="12:00" onChange={onChange} />);

    const amButton = screen.getByRole('button', { name: 'AM' });
    fireEvent.click(amButton);

    expect(onChange).toHaveBeenCalledWith('00:00');
  });

  it('shows error and keeps invalid input visible on invalid time', () => {
    const onChange = jest.fn();
    render(<TimeInput {...defaultProps} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'invalid' } });
    fireEvent.blur(input);

    // Should NOT call onChange with invalid input
    expect(onChange).not.toHaveBeenCalled();
    // Should show error message
    expect(screen.getByText('Invalid time format. Try 9:30 or 930')).toBeInTheDocument();
    // Should keep the invalid text visible
    expect(input).toHaveValue('invalid');
  });

  it('clears error when user focuses back on input', () => {
    const onChange = jest.fn();
    render(<TimeInput {...defaultProps} onChange={onChange} />);

    const input = screen.getByRole('textbox');

    // Enter invalid input
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'bad' } });
    fireEvent.blur(input);

    expect(screen.getByText('Invalid time format. Try 9:30 or 930')).toBeInTheDocument();

    // Focus again should clear error
    fireEvent.focus(input);
    expect(screen.queryByText('Invalid time format. Try 9:30 or 930')).not.toBeInTheDocument();
  });

  it('clears input without error when empty', () => {
    const onChange = jest.fn();
    render(<TimeInput {...defaultProps} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith('');
    expect(screen.queryByText('Invalid time format. Try 9:30 or 930')).not.toBeInTheDocument();
  });

  it('displays error message when error prop is provided', () => {
    render(<TimeInput {...defaultProps} error="Invalid time" />);
    expect(screen.getByText('Invalid time')).toBeInTheDocument();
  });

  it('does not toggle period when no value is set', () => {
    const onChange = jest.fn();
    render(<TimeInput {...defaultProps} value="" onChange={onChange} />);

    const pmButton = screen.getByRole('button', { name: 'PM' });
    fireEvent.click(pmButton);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('displays placeholder text', () => {
    render(<TimeInput {...defaultProps} />);
    const input = screen.getByPlaceholderText('9:30');
    expect(input).toBeInTheDocument();
  });
});
