export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          first_name: string | null;
          last_name: string | null;
          profile_photo_url: string | null;
          city: string | null;
          state: string | null;
          bio: string | null;
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
        };
        Insert: {
          id: string;
          first_name?: string | null;
          last_name?: string | null;
          profile_photo_url?: string | null;
          city?: string | null;
          state?: string | null;
          bio?: string | null;
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
        };
        Update: {
          id?: string;
          first_name?: string | null;
          last_name?: string | null;
          profile_photo_url?: string | null;
          city?: string | null;
          state?: string | null;
          bio?: string | null;
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
