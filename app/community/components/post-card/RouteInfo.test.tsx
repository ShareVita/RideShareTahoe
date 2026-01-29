import { render, screen } from '@testing-library/react';
import { RouteInfo } from './RouteInfo';

// Mock sanitize function
jest.mock('@/libs/sanitize/location', () => ({
  sanitizeLocation: jest.fn((location: string) =>
    location.replace(/<script>.*?<\/script>/gi, '[SANITIZED]')
  ),
}));

describe('RouteInfo', () => {
  it('should display start and end locations', () => {
    render(<RouteInfo startLocation="San Francisco" endLocation="Lake Tahoe" />);
    expect(screen.getByText('San Francisco')).toBeInTheDocument();
    expect(screen.getByText('Lake Tahoe')).toBeInTheDocument();
  });

  it('should display From and To labels', () => {
    render(<RouteInfo startLocation="SF" endLocation="LA" />);
    expect(screen.getByText('From:')).toBeInTheDocument();
    expect(screen.getByText('To:')).toBeInTheDocument();
  });

  it('should sanitize locations with script tags', () => {
    render(<RouteInfo startLocation="<script>alert('xss')</script>SF" endLocation="LA" />);
    expect(screen.getByText(/\[SANITIZED\]/)).toBeInTheDocument();
    expect(screen.queryByText('<script>')).not.toBeInTheDocument();
  });

  it('should handle empty locations', () => {
    render(<RouteInfo startLocation="" endLocation="" />);
    expect(screen.getByText('From:')).toBeInTheDocument();
    expect(screen.getByText('To:')).toBeInTheDocument();
  });

  it('should handle special characters in locations', () => {
    render(<RouteInfo startLocation="São Paulo, Brazil" endLocation="Zürich, Switzerland" />);
    expect(screen.getByText('São Paulo, Brazil')).toBeInTheDocument();
    expect(screen.getByText('Zürich, Switzerland')).toBeInTheDocument();
  });
});
