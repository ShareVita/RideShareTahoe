export default function FaqJsonLd() {
  const faqData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Is RideShareTahoe free to use?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! RideShareTahoe is completely free to use. We believe in building community connections without financial barriers. Drivers and passengers arrange cost-sharing directly.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do I post a ride?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "To post a ride, go to the Community page and click 'Post a Ride'. Select whether you are driving or need a ride, enter your trip details, and publish your post.",
        },
      },
      {
        '@type': 'Question',
        name: 'How do I find a ride?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "Visit the Community page and browse the 'Drivers' tab. You'll see posts from drivers offering rides. Click 'Message' to start a conversation.",
        },
      },
      {
        '@type': 'Question',
        name: 'How do I confirm a trip?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'After connecting with a driver or passenger, confirm the details in the chat. Exchange contact info and agree on the meeting time and place.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do I leave a review?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "After a trip is completed, go to the user's profile and click 'Leave Review'. Rate the experience (1-5 stars) and write a comment to help build trust in the community.",
        },
      },
      {
        '@type': 'Question',
        name: 'What is a Passenger Request?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'A Passenger Request is a post made by someone looking for a ride. Drivers can browse these requests to find passengers to fill their empty seats.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do I edit or delete my posts?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "Go to the Community page and click on the 'My Rides' tab. Find the post you want to modify and click 'Edit' to update it, or 'Delete' to remove it from the listings.",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }}
    />
  );
}
