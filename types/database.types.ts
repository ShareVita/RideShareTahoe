export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          first_name: string | null;
          last_name: string | null;
          role: string | null;
          bio: string | null;
          profile_photo_url: string | null;
          is_admin: boolean;
          is_banned: boolean;
          display_lat: number | null;
          display_lng: number | null;
          display_lat_offset: number | null;
          display_lng_offset: number | null;
          neighborhood: string | null;
          city: string | null;
          state: string | null;
          preferences: Json | null;
          car_details: Json | null;
          community_support_badge: string | null;
          support_preferences: string[] | null;
          support_story: string | null;
          other_support_description: string | null;
          facebook_url: string | null;
          instagram_url: string | null;
          linkedin_url: string | null;
          airbnb_url: string | null;
          other_social_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          first_name?: string | null;
          last_name?: string | null;
          role?: string | null;
          bio?: string | null;
          profile_photo_url?: string | null;
          is_admin?: boolean;
          is_banned?: boolean;
          display_lat?: number | null;
          display_lng?: number | null;
          display_lat_offset?: number | null;
          display_lng_offset?: number | null;
          neighborhood?: string | null;
          city?: string | null;
          state?: string | null;
          preferences?: Json | null;
          car_details?: Json | null;
          community_support_badge?: string | null;
          support_preferences?: string[] | null;
          support_story?: string | null;
          other_support_description?: string | null;
          facebook_url?: string | null;
          instagram_url?: string | null;
          linkedin_url?: string | null;
          airbnb_url?: string | null;
          other_social_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string | null;
          last_name?: string | null;
          role?: string | null;
          bio?: string | null;
          profile_photo_url?: string | null;
          is_admin?: boolean;
          is_banned?: boolean;
          display_lat?: number | null;
          display_lng?: number | null;
          display_lat_offset?: number | null;
          display_lng_offset?: number | null;
          neighborhood?: string | null;
          city?: string | null;
          state?: string | null;
          preferences?: Json | null;
          car_details?: Json | null;
          community_support_badge?: string | null;
          support_preferences?: string[] | null;
          support_story?: string | null;
          other_support_description?: string | null;
          facebook_url?: string | null;
          instagram_url?: string | null;
          linkedin_url?: string | null;
          airbnb_url?: string | null;
          other_social_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      rides: {
        Row: {
          id: string;
          poster_id: string;
          posting_type: string;
          start_location: string;
          end_location: string;
          departure_date: string;
          departure_time: string;
          available_seats: number | null;
          status: string;
          start_lat: number | null;
          start_lng: number | null;
          end_lat: number | null;
          end_lng: number | null;
          trip_direction: string | null;
          round_trip_group_id: string | null;
          is_recurring: boolean | null;
          recurring_days: string[] | null;
          pricing_type: string | null;
          price_per_seat: number | null;
          gas_estimate: number | null;
          total_seats: number | null;
          car_type: string | null;
          has_awd: boolean | null;
          driving_arrangement: string | null;
          music_preference: string | null;
          conversation_preference: string | null;
          title: string | null;
          description: string | null;
          special_instructions: string | null;
          created_at: string;
          return_date: string | null;
          return_time: string | null;
          is_round_trip: boolean | null;
        };
        Insert: {
          id: string;
          poster_id: string;
          posting_type: string;
          start_location: string;
          end_location: string;
          departure_date: string;
          departure_time: string;
          available_seats?: number | null;
          status?: string;
          start_lat?: number | null;
          start_lng?: number | null;
          end_lat?: number | null;
          end_lng?: number | null;
          trip_direction?: string | null;
          round_trip_group_id?: string | null;
          is_recurring?: boolean | null;
          recurring_days?: string[] | null;
          pricing_type?: string | null;
          price_per_seat?: number | null;
          gas_estimate?: number | null;
          total_seats?: number | null;
          car_type?: string | null;
          has_awd?: boolean | null;
          driving_arrangement?: string | null;
          music_preference?: string | null;
          conversation_preference?: string | null;
          title?: string | null;
          description?: string | null;
          special_instructions?: string | null;
          created_at?: string;
          return_date?: string | null;
          return_time?: string | null;
          is_round_trip?: boolean | null;
        };
        Update: {
          id?: string;
          poster_id?: string;
          posting_type?: string;
          start_location?: string;
          end_location?: string;
          departure_date?: string;
          departure_time?: string;
          available_seats?: number | null;
          status?: string;
          start_lat?: number | null;
          start_lng?: number | null;
          end_lat?: number | null;
          end_lng?: number | null;
          trip_direction?: string | null;
          round_trip_group_id?: string | null;
          is_recurring?: boolean | null;
          recurring_days?: string[] | null;
          pricing_type?: string | null;
          price_per_seat?: number | null;
          gas_estimate?: number | null;
          total_seats?: number | null;
          car_type?: string | null;
          has_awd?: boolean | null;
          driving_arrangement?: string | null;
          music_preference?: string | null;
          conversation_preference?: string | null;
          title?: string | null;
          description?: string | null;
          special_instructions?: string | null;
          created_at?: string;
          return_date?: string | null;
          return_time?: string | null;
          is_round_trip?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: 'rides_poster_id_fkey';
            columns: ['poster_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      trip_bookings: {
        Row: {
          id: string;
          ride_id: string;
          driver_id: string;
          passenger_id: string;
          pickup_location: string | null;
          pickup_time: string | null;
          status: string;
          driver_notes: string | null;
          passenger_notes: string | null;
          confirmed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          ride_id: string;
          driver_id: string;
          passenger_id: string;
          pickup_location?: string | null;
          pickup_time?: string | null;
          status?: string;
          driver_notes?: string | null;
          passenger_notes?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ride_id?: string;
          driver_id?: string;
          passenger_id?: string;
          pickup_location?: string | null;
          pickup_time?: string | null;
          status?: string;
          driver_notes?: string | null;
          passenger_notes?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'trip_bookings_driver_id_fkey';
            columns: ['driver_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trip_bookings_passenger_id_fkey';
            columns: ['passenger_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trip_bookings_ride_id_fkey';
            columns: ['ride_id'];
            referencedRelation: 'rides';
            referencedColumns: ['id'];
          },
        ];
      };
      vehicles: {
        Row: {
          id: string;
          owner_id: string;
          make: string;
          model: string;
          year: number;
          color: string;
          license_plate: string | null;
          created_at: string;
          updated_at: string;
          drivetrain: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          make: string;
          model: string;
          year: number;
          color: string;
          license_plate?: string | null;
          created_at?: string;
          updated_at?: string;
          drivetrain?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          make?: string;
          model?: string;
          year?: number;
          color?: string;
          license_plate?: string | null;
          created_at?: string;
          updated_at?: string;
          drivetrain?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'vehicles_owner_id_fkey';
            columns: ['owner_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      user_consents: {
        Row: {
          id: string;
          user_id: string;
          document_type: 'tos' | 'privacy_policy' | 'community_guidelines';
          document_version: string;
          accepted_at: string;
          ip_address: string | null;
          user_agent: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          document_type: 'tos' | 'privacy_policy' | 'community_guidelines';
          document_version?: string;
          accepted_at?: string;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          document_type?: 'tos' | 'privacy_policy' | 'community_guidelines';
          document_version?: string;
          accepted_at?: string;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      user_private_info: {
        Row: {
          id: string;
          email: string | null;
          phone_number: string | null;
          street_address: string | null;
          zip_code: string | null;
          emergency_contact_name: string | null;
          emergency_contact_number: string | null;
          emergency_contact_email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          phone_number?: string | null;
          street_address?: string | null;
          zip_code?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_number?: string | null;
          emergency_contact_email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          phone_number?: string | null;
          street_address?: string | null;
          zip_code?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_number?: string | null;
          emergency_contact_email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_activity: {
        Row: {
          id: number;
          user_id: string;
          event: string;
          metadata: Json;
          at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          event: string;
          metadata?: Json;
          at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          event?: string;
          metadata?: Json;
          at?: string;
        };
        Relationships: [];
      };
      email_events: {
        Row: {
          id: number;
          user_id: string;
          email_type: string;
          status: 'queued' | 'sent' | 'failed' | 'skipped';
          external_message_id: string | null;
          error: string | null;
          to_email: string;
          subject: string | null;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          email_type: string;
          status: 'queued' | 'sent' | 'failed' | 'skipped';
          external_message_id?: string | null;
          error?: string | null;
          to_email: string;
          subject?: string | null;
          payload?: Json;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          email_type?: string;
          status?: 'queued' | 'sent' | 'failed' | 'skipped';
          external_message_id?: string | null;
          error?: string | null;
          to_email?: string;
          subject?: string | null;
          payload?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      scheduled_emails: {
        Row: {
          id: number;
          user_id: string;
          email_type: string;
          run_after: string;
          payload: Json;
          status: 'pending' | 'sent' | 'cancelled';
          picked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          email_type: string;
          run_after: string;
          payload?: Json;
          status?: 'pending' | 'sent' | 'cancelled';
          picked_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          email_type?: string;
          run_after?: string;
          payload?: Json;
          status?: 'pending' | 'sent' | 'cancelled';
          picked_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          participant1_id: string;
          participant2_id: string;
          ride_id: string | null;
          last_message_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          participant1_id: string;
          participant2_id: string;
          ride_id?: string | null;
          last_message_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          participant1_id?: string;
          participant2_id?: string;
          ride_id?: string | null;
          last_message_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          recipient_id: string;
          ride_id: string | null;
          conversation_id: string | null;
          subject: string | null;
          content: string;
          is_read: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          recipient_id: string;
          ride_id?: string | null;
          conversation_id?: string | null;
          subject?: string | null;
          content: string;
          is_read?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sender_id?: string;
          recipient_id?: string;
          ride_id?: string | null;
          conversation_id?: string | null;
          subject?: string | null;
          content?: string;
          is_read?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          reviewer_id: string;
          reviewee_id: string;
          conversation_id: string | null;
          booking_id: string | null;
          rating: number;
          review_text: string | null;
          reviewer_role: 'driver' | 'passenger';
          reviewed_role: 'driver' | 'passenger';
          status: 'active' | 'hidden' | 'deleted';
          is_pending: boolean;
          review_trigger_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reviewer_id: string;
          reviewee_id: string;
          conversation_id?: string | null;
          booking_id?: string | null;
          rating: number;
          review_text?: string | null;
          reviewer_role: 'driver' | 'passenger';
          reviewed_role: 'driver' | 'passenger';
          status?: 'active' | 'hidden' | 'deleted';
          is_pending?: boolean;
          review_trigger_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reviewer_id?: string;
          reviewee_id?: string;
          conversation_id?: string | null;
          booking_id?: string | null;
          rating?: number;
          review_text?: string | null;
          reviewer_role?: 'driver' | 'passenger';
          reviewed_role?: 'driver' | 'passenger';
          status?: 'active' | 'hidden' | 'deleted';
          is_pending?: boolean;
          review_trigger_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_blocks: {
        Row: {
          id: string;
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          blocker_id: string;
          blocked_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          blocker_id?: string;
          blocked_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      account_deletion_requests: {
        Row: {
          id: string;
          user_id: string;
          reason: string | null;
          status: 'pending' | 'processing' | 'completed' | 'cancelled';
          scheduled_deletion_date: string;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          reason?: string | null;
          status?: 'pending' | 'processing' | 'completed' | 'cancelled';
          scheduled_deletion_date?: string;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          reason?: string | null;
          status?: 'pending' | 'processing' | 'completed' | 'cancelled';
          scheduled_deletion_date?: string;
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      profile_socials: {
        Row: {
          user_id: string;
          facebook_url: string | null;
          instagram_url: string | null;
          linkedin_url: string | null;
          airbnb_url: string | null;
          other_social_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          facebook_url?: string | null;
          instagram_url?: string | null;
          linkedin_url?: string | null;
          airbnb_url?: string | null;
          other_social_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          facebook_url?: string | null;
          instagram_url?: string | null;
          linkedin_url?: string | null;
          airbnb_url?: string | null;
          other_social_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      // eslint-disable-next-line no-unused-vars
      [_ in never]: never;
    };
    Functions: {
      // eslint-disable-next-line no-unused-vars
      [_ in never]: never;
    };
    Enums: {
      // eslint-disable-next-line no-unused-vars
      [_ in never]: never;
    };
    CompositeTypes: {
      // eslint-disable-next-line no-unused-vars
      [_ in never]: never;
    };
  };
}
