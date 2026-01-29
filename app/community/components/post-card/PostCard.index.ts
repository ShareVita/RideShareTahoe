// Main PostCard component
export {
  PostCard,
  isDriverPost,
  isPassengerPost,
} from '@/app/community/components/post-card/PostCard.refactored';

// Subcomponents (exported for testing and potential reuse)
export { PostCardHeader } from './PostCardHeader';
export { RouteInfo } from './RouteInfo';
export { OwnerInfo } from './OwnerInfo';
export { DriverActions } from './DriverActions';
export { PassengerActions } from './PassengerActions';
