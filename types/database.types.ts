export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          created_at: string | null;
          id: string;
          processed_at: string | null;
          reason: string | null;
          scheduled_deletion_date: string;
          status: string | null;
          updated_at: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          id?: string;
          processed_at?: string | null;
          reason?: string | null;
          scheduled_deletion_date?: string;
          status?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          processed_at?: string | null;
          reason?: string | null;
          scheduled_deletion_date?: string;
          status?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'account_deletion_requests_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      conversations: {
        Row: {
          created_at: string | null;
          id: string;
          last_message_at: string | null;
          participant1_id: string;
          participant2_id: string;
          ride_id: string | null;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          id?: string;
          last_message_at?: string | null;
          participant1_id: string;
          participant2_id: string;
          ride_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          last_message_at?: string | null;
          participant1_id?: string;
          participant2_id?: string;
          ride_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'conversations_participant1_id_fkey';
            columns: ['participant1_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversations_participant2_id_fkey';
            columns: ['participant2_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversations_ride_id_fkey';
            columns: ['ride_id'];
            isOneToOne: false;
            referencedRelation: 'rides';
            referencedColumns: ['id'];
          },
        ];
      };
      email_events: {
        Row: {
          created_at: string | null;
          email_type: string;
          error: string | null;
          external_message_id: string | null;
          id: number;
          payload: Json | null;
          status: string;
          subject: string | null;
          to_email: string;
          updated_at: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          email_type: string;
          error?: string | null;
          external_message_id?: string | null;
          id?: number;
          payload?: Json | null;
          status: string;
          subject?: string | null;
          to_email: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          email_type?: string;
          error?: string | null;
          external_message_id?: string | null;
          id?: number;
          payload?: Json | null;
          status?: string;
          subject?: string | null;
          to_email?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          content: string;
          conversation_id: string | null;
          created_at: string | null;
          id: string;
          is_read: boolean | null;
          recipient_id: string;
          ride_id: string | null;
          sender_id: string;
          subject: string | null;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          content: string;
          conversation_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          recipient_id: string;
          ride_id?: string | null;
          sender_id: string;
          subject?: string | null;
          updated_at?: string | null;
        };
        Update: {
          content?: string;
          conversation_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          recipient_id?: string;
          ride_id?: string | null;
          sender_id?: string;
          subject?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_ride_id_fkey';
            columns: ['ride_id'];
            isOneToOne: false;
            referencedRelation: 'rides';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profile_socials: {
        Row: {
          airbnb_url: string | null;
          created_at: string | null;
          facebook_url: string | null;
          instagram_url: string | null;
          linkedin_url: string | null;
          other_social_url: string | null;
          updated_at: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          airbnb_url?: string | null;
          created_at?: string | null;
          facebook_url?: string | null;
          instagram_url?: string | null;
          linkedin_url?: string | null;
          other_social_url?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          airbnb_url?: string | null;
          created_at?: string | null;
          facebook_url?: string | null;
          instagram_url?: string | null;
          linkedin_url?: string | null;
          other_social_url?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_socials_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          bio: string | null;
          city: string | null;
          created_at: string | null;
          deleted_at: string | null;
          display_lat: number | null;
          display_lat_offset: number | null;
          display_lng: number | null;
          display_lng_offset: number | null;
          first_name: string | null;
          id: string;
          is_admin: boolean | null;
          is_banned: boolean | null;
          last_name: string | null;
          preferences: Json | null;
          profile_photo_url: string | null;
          pronouns: string | null;
          state: string | null;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          bio?: string | null;
          city?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          display_lat?: number | null;
          display_lat_offset?: number | null;
          display_lng?: number | null;
          display_lng_offset?: number | null;
          first_name?: string | null;
          id: string;
          is_admin?: boolean | null;
          is_banned?: boolean | null;
          last_name?: string | null;
          preferences?: Json | null;
          profile_photo_url?: string | null;
          pronouns?: string | null;
          state?: string | null;
          updated_at?: string | null;
        };
        Update: {
          bio?: string | null;
          city?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          display_lat?: number | null;
          display_lat_offset?: number | null;
          display_lng?: number | null;
          display_lng_offset?: number | null;
          first_name?: string | null;
          id?: string;
          is_admin?: boolean | null;
          is_banned?: boolean | null;
          last_name?: string | null;
          preferences?: Json | null;
          profile_photo_url?: string | null;
          pronouns?: string | null;
          state?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      rate_limits: {
        Row: {
          created_at: string;
          endpoint: string;
          id: string;
          key: string;
          request_count: number;
          window_start: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          endpoint: string;
          id?: string;
          key: string;
          request_count?: number;
          window_start?: string;
        };
        Update: {
          created_at?: string;
          endpoint?: string;
          id?: string;
          key?: string;
          request_count?: number;
          window_start?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          created_at: string | null;
          details: string | null;
          id: string;
          reason: string;
          reported_id: string;
          reporter_id: string;
          status: string | null;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          details?: string | null;
          id?: string;
          reason: string;
          reported_id: string;
          reporter_id: string;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          details?: string | null;
          id?: string;
          reason?: string;
          reported_id?: string;
          reporter_id?: string;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'reports_reported_id_fkey';
            columns: ['reported_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      reviews: {
        Row: {
          booking_id: string | null;
          comment: string;
          conversation_id: string | null;
          created_at: string | null;
          id: string;
          is_pending: boolean | null;
          rating: number;
          review_text: string | null;
          review_trigger_date: string | null;
          reviewed_role: string;
          reviewee_id: string;
          reviewer_id: string;
          reviewer_role: string;
          status: string | null;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          booking_id?: string | null;
          comment: string;
          conversation_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_pending?: boolean | null;
          rating: number;
          review_text?: string | null;
          review_trigger_date?: string | null;
          reviewed_role: string;
          reviewee_id: string;
          reviewer_id: string;
          reviewer_role: string;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          booking_id?: string | null;
          comment?: string;
          conversation_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_pending?: boolean | null;
          rating?: number;
          review_text?: string | null;
          review_trigger_date?: string | null;
          reviewed_role?: string;
          reviewee_id?: string;
          reviewer_id?: string;
          reviewer_role?: string;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'reviews_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'trip_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_reviewee_id_fkey';
            columns: ['reviewee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_reviewer_id_fkey';
            columns: ['reviewer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      reviews_pending: {
        Row: {
          booking_id: string | null;
          conversation_id: string;
          created_at: string | null;
          days_since_last_message: number;
          id: string;
          is_notified: boolean | null;
          notification_sent_at: string | null;
          other_participant_id: string;
          other_role: string;
          role: string;
          updated_at: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          booking_id?: string | null;
          conversation_id: string;
          created_at?: string | null;
          days_since_last_message: number;
          id?: string;
          is_notified?: boolean | null;
          notification_sent_at?: string | null;
          other_participant_id: string;
          other_role: string;
          role: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          booking_id?: string | null;
          conversation_id?: string;
          created_at?: string | null;
          days_since_last_message?: number;
          id?: string;
          is_notified?: boolean | null;
          notification_sent_at?: string | null;
          other_participant_id?: string;
          other_role?: string;
          role?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reviews_pending_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'trip_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_pending_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_pending_other_participant_id_fkey';
            columns: ['other_participant_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_pending_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      rides: {
        Row: {
          available_seats: number | null;
          car_type: string | null;
          conversation_preference: string | null;
          created_at: string | null;
          departure_date: string;
          departure_time: string;
          description: string | null;
          driving_arrangement: string | null;
          end_lat: number | null;
          end_lng: number | null;
          end_location: string;
          gas_estimate: number | null;
          has_awd: boolean | null;
          id: string;
          is_recurring: boolean | null;
          is_round_trip: boolean | null;
          music_preference: string | null;
          poster_id: string;
          posting_type: string;
          price_per_seat: number | null;
          pricing_type: string | null;
          recurring_days: string[] | null;
          return_date: string | null;
          return_time: string | null;
          round_trip_group_id: string | null;
          special_instructions: string | null;
          start_lat: number | null;
          start_lng: number | null;
          start_location: string;
          status: string | null;
          title: string | null;
          total_seats: number | null;
          trip_direction: string | null;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          available_seats?: number | null;
          car_type?: string | null;
          conversation_preference?: string | null;
          created_at?: string | null;
          departure_date: string;
          departure_time: string;
          description?: string | null;
          driving_arrangement?: string | null;
          end_lat?: number | null;
          end_lng?: number | null;
          end_location: string;
          gas_estimate?: number | null;
          has_awd?: boolean | null;
          id?: string;
          is_recurring?: boolean | null;
          is_round_trip?: boolean | null;
          music_preference?: string | null;
          poster_id: string;
          posting_type: string;
          price_per_seat?: number | null;
          pricing_type?: string | null;
          recurring_days?: string[] | null;
          return_date?: string | null;
          return_time?: string | null;
          round_trip_group_id?: string | null;
          special_instructions?: string | null;
          start_lat?: number | null;
          start_lng?: number | null;
          start_location: string;
          status?: string | null;
          title?: string | null;
          total_seats?: number | null;
          trip_direction?: string | null;
          updated_at?: string | null;
        };
        Update: {
          available_seats?: number | null;
          car_type?: string | null;
          conversation_preference?: string | null;
          created_at?: string | null;
          departure_date?: string;
          departure_time?: string;
          description?: string | null;
          driving_arrangement?: string | null;
          end_lat?: number | null;
          end_lng?: number | null;
          end_location?: string;
          gas_estimate?: number | null;
          has_awd?: boolean | null;
          id?: string;
          is_recurring?: boolean | null;
          is_round_trip?: boolean | null;
          music_preference?: string | null;
          poster_id?: string;
          posting_type?: string;
          price_per_seat?: number | null;
          pricing_type?: string | null;
          recurring_days?: string[] | null;
          return_date?: string | null;
          return_time?: string | null;
          round_trip_group_id?: string | null;
          special_instructions?: string | null;
          start_lat?: number | null;
          start_lng?: number | null;
          start_location?: string;
          status?: string | null;
          title?: string | null;
          total_seats?: number | null;
          trip_direction?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'rides_poster_id_fkey';
            columns: ['poster_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      scheduled_emails: {
        Row: {
          created_at: string | null;
          email_type: string;
          id: number;
          payload: Json | null;
          picked_at: string | null;
          run_after: string;
          status: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          email_type: string;
          id?: number;
          payload?: Json | null;
          picked_at?: string | null;
          run_after: string;
          status?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          email_type?: string;
          id?: number;
          payload?: Json | null;
          picked_at?: string | null;
          run_after?: string;
          status?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      trip_bookings: {
        Row: {
          confirmed_at: string | null;
          created_at: string | null;
          driver_id: string;
          driver_notes: string | null;
          id: string;
          passenger_id: string;
          passenger_notes: string | null;
          pickup_lat: number | null;
          pickup_lng: number | null;
          pickup_location: string | null;
          pickup_time: string | null;
          ride_id: string;
          status: string;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          confirmed_at?: string | null;
          created_at?: string | null;
          driver_id: string;
          driver_notes?: string | null;
          id?: string;
          passenger_id: string;
          passenger_notes?: string | null;
          pickup_lat?: number | null;
          pickup_lng?: number | null;
          pickup_location?: string | null;
          pickup_time?: string | null;
          ride_id: string;
          status?: string;
          updated_at?: string | null;
        };
        Update: {
          confirmed_at?: string | null;
          created_at?: string | null;
          driver_id?: string;
          driver_notes?: string | null;
          id?: string;
          passenger_id?: string;
          passenger_notes?: string | null;
          pickup_lat?: number | null;
          pickup_lng?: number | null;
          pickup_location?: string | null;
          pickup_time?: string | null;
          ride_id?: string;
          status?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'trip_bookings_driver_id_fkey';
            columns: ['driver_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trip_bookings_passenger_id_fkey';
            columns: ['passenger_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trip_bookings_ride_id_fkey';
            columns: ['ride_id'];
            isOneToOne: false;
            referencedRelation: 'rides';
            referencedColumns: ['id'];
          },
        ];
      };
      user_activity: {
        Row: {
          at: string | null;
          event: string;
          id: number;
          metadata: Json | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          at?: string | null;
          event: string;
          id?: number;
          metadata?: Json | null;
          user_id: string;
        };
        Update: {
          at?: string | null;
          event?: string;
          id?: number;
          metadata?: Json | null;
          user_id?: string;
        };
        Relationships: [];
      };
      user_blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string | null;
          id: string;
        };
        ComputedFields: never;
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string | null;
          id?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string | null;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_blocks_blocked_id_fkey';
            columns: ['blocked_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_blocks_blocker_id_fkey';
            columns: ['blocker_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      user_consents: {
        Row: {
          accepted_at: string;
          document_type: string;
          document_version: string;
          id: string;
          ip_address: string | null;
          user_agent: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string;
          document_type: string;
          document_version?: string;
          id?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          accepted_at?: string;
          document_type?: string;
          document_version?: string;
          id?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      user_latest_login: {
        Row: {
          last_login_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          last_login_at: string;
          user_id: string;
        };
        Update: {
          last_login_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_private_info: {
        Row: {
          created_at: string | null;
          email: string | null;
          emergency_contact_email: string | null;
          emergency_contact_name: string | null;
          emergency_contact_number: string | null;
          id: string;
          marketing_unsubscribed_at: string | null;
          phone_number: string | null;
          street_address: string | null;
          updated_at: string | null;
          zip_code: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          email?: string | null;
          emergency_contact_email?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_number?: string | null;
          id: string;
          marketing_unsubscribed_at?: string | null;
          phone_number?: string | null;
          street_address?: string | null;
          updated_at?: string | null;
          zip_code?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string | null;
          emergency_contact_email?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_number?: string | null;
          id?: string;
          marketing_unsubscribed_at?: string | null;
          phone_number?: string | null;
          street_address?: string | null;
          updated_at?: string | null;
          zip_code?: string | null;
        };
        Relationships: [];
      };
      vehicles: {
        Row: {
          color: string;
          created_at: string | null;
          drivetrain: string | null;
          id: string;
          license_plate: string | null;
          make: string;
          model: string;
          owner_id: string;
          updated_at: string | null;
          year: number;
        };
        ComputedFields: never;
        Insert: {
          color: string;
          created_at?: string | null;
          drivetrain?: string | null;
          id?: string;
          license_plate?: string | null;
          make: string;
          model: string;
          owner_id: string;
          updated_at?: string | null;
          year: number;
        };
        Update: {
          color?: string;
          created_at?: string | null;
          drivetrain?: string | null;
          id?: string;
          license_plate?: string | null;
          make?: string;
          model?: string;
          owner_id?: string;
          updated_at?: string | null;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'vehicles_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      check_rate_limit: {
        Args: {
          p_endpoint: string;
          p_key: string;
          p_max_requests?: number;
          p_window_seconds?: number;
        };
        Returns: Json;
      };
      cleanup_old_rate_limits: { Args: { p_older_than_hours?: number }; Returns: number };
      get_user_average_rating: { Args: { user_id: string }; Returns: number };
      get_user_review_count: { Args: { user_id: string }; Returns: number };
      has_active_booking_with: { Args: { other_user_id: string }; Returns: boolean };
      is_auth_retention_maintenance: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_live_account: { Args: { account_id?: string }; Returns: boolean };
      is_profile_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_user_blocked: { Args: { other_user_id: string }; Returns: boolean };
      search_users: {
        Args: { page_number: number; page_size: number; search_term: string };
        Returns: {
          created_at: string;
          email: string;
          first_name: string;
          id: string;
          is_admin: boolean;
          is_banned: boolean;
          last_name: string;
          profile_photo_url: string;
          total_count: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
