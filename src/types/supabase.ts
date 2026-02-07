export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      affiliation_clicks: {
        Row: {
          affiliation_id: string
          clicked_at: string
          device_id: string | null
          id: string
          ip_address: unknown | null
          referrer: string | null
        }
        Insert: {
          affiliation_id: string
          clicked_at?: string
          device_id?: string | null
          id?: string
          ip_address?: unknown | null
          referrer?: string | null
        }
        Update: {
          affiliation_id?: string
          clicked_at?: string
          device_id?: string | null
          id?: string
          ip_address?: unknown | null
          referrer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliation_clicks_affiliation_id_fkey"
            columns: ["affiliation_id"]
            isOneToOne: false
            referencedRelation: "affiliations"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliation_conversions: {
        Row: {
          affiliation_id: string
          amount_cents: number
          booking_id: string
          commission_cents: number
          converted_at: string
          id: string
        }
        Insert: {
          affiliation_id: string
          amount_cents: number
          booking_id: string
          commission_cents: number
          converted_at?: string
          id?: string
        }
        Update: {
          affiliation_id?: string
          amount_cents?: number
          booking_id?: string
          commission_cents?: number
          converted_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliation_conversions_affiliation_id_fkey"
            columns: ["affiliation_id"]
            isOneToOne: false
            referencedRelation: "affiliations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliation_conversions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliations: {
        Row: {
          active: boolean | null
          clicks: number | null
          code: string
          conversions: number | null
          created_at: string
          id: string
          owner_id: string
          payout_ratio: number
          total_earned_cents: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          clicks?: number | null
          code: string
          conversions?: number | null
          created_at?: string
          id?: string
          owner_id: string
          payout_ratio: number
          total_earned_cents?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          clicks?: number | null
          code?: string
          conversions?: number | null
          created_at?: string
          id?: string
          owner_id?: string
          payout_ratio?: number
          total_earned_cents?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      amenities: {
        Row: {
          category: string
          created_at: string
          icon: string | null
          key: string
          label_ar: string | null
          label_en: string | null
          label_fr: string
        }
        Insert: {
          category: string
          created_at?: string
          icon?: string | null
          key: string
          label_ar?: string | null
          label_en?: string | null
          label_fr: string
        }
        Update: {
          category?: string
          created_at?: string
          icon?: string | null
          key?: string
          label_ar?: string | null
          label_en?: string | null
          label_fr?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          app_version: string | null
          booking_id: string | null
          city: string | null
          country: string | null
          device_id: string | null
          experience_id: string | null
          id: string
          ip_address: unknown | null
          name: string
          platform: string | null
          props: Json | null
          reel_id: string | null
          referrer: string | null
          session_id: string | null
          ts: string
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          app_version?: string | null
          booking_id?: string | null
          city?: string | null
          country?: string | null
          device_id?: string | null
          experience_id?: string | null
          id?: string
          ip_address?: unknown | null
          name: string
          platform?: string | null
          props?: Json | null
          reel_id?: string | null
          referrer?: string | null
          session_id?: string | null
          ts?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          app_version?: string | null
          booking_id?: string | null
          city?: string | null
          country?: string | null
          device_id?: string | null
          experience_id?: string | null
          id?: string
          ip_address?: unknown | null
          name?: string
          platform?: string | null
          props?: Json | null
          reel_id?: string | null
          referrer?: string | null
          session_id?: string | null
          ts?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          adults: number
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          children: number | null
          completed_at: string | null
          created_at: string
          currency: string
          deleted_at: string | null
          departure_id: string | null
          experience_id: string
          from_date: string
          guest_id: string
          guest_notes: string | null
          host_id: string
          host_notes: string | null
          host_response_template: string | null
          id: string
          infants: number | null
          metadata: Json | null
          party_details: Json | null
          payment_intent_id: string | null
          price_fees_cents: number | null
          price_subtotal_cents: number
          price_taxes_cents: number | null
          price_total_cents: number
          rooms: Json | null
          status: Database["public"]["Enums"]["booking_status"] | null
          to_date: string
          updated_at: string
          responded_at: string | null
        }
        Insert: {
          adults?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          children?: number | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          departure_id?: string | null
          experience_id: string
          from_date: string
          guest_id: string
          guest_notes?: string | null
          host_id: string
          host_notes?: string | null
          host_response_template?: string | null
          id?: string
          infants?: number | null
          metadata?: Json | null
          party_details?: Json | null
          payment_intent_id?: string | null
          price_fees_cents?: number | null
          price_subtotal_cents: number
          price_taxes_cents?: number | null
          price_total_cents: number
          rooms?: Json | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          to_date: string
          updated_at?: string
          responded_at?: string | null
        }
        Update: {
          adults?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          children?: number | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          departure_id?: string | null
          experience_id?: string
          from_date?: string
          guest_id?: string
          guest_notes?: string | null
          host_id?: string
          host_notes?: string | null
          host_response_template?: string | null
          id?: string
          infants?: number | null
          metadata?: Json | null
          party_details?: Json | null
          payment_intent_id?: string | null
          price_fees_cents?: number | null
          price_subtotal_cents?: number
          price_taxes_cents?: number | null
          price_total_cents?: number
          rooms?: Json | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          to_date?: string
          updated_at?: string
          responded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "trip_departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      chats_messages: {
        Row: {
          booking_id: string | null
          created_at: string
          deleted_at: string | null
          delivered_at: string | null
          experience_id: string | null
          id: string
          media_ids: string[] | null
          metadata: Json | null
          read_by: string[] | null
          sender_id: string
          text: string | null
          thread_id: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          experience_id?: string | null
          id?: string
          media_ids?: string[] | null
          metadata?: Json | null
          read_by?: string[] | null
          sender_id: string
          text?: string | null
          thread_id: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          experience_id?: string | null
          id?: string
          media_ids?: string[] | null
          metadata?: Json | null
          read_by?: string[] | null
          sender_id?: string
          text?: string | null
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_messages_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chats_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chats_threads: {
        Row: {
          archived_at: string | null
          booking_id: string | null
          created_at: string
          experience_id: string | null
          id: string
          is_group: boolean | null
          last_message_at: string | null
          last_message_preview: string | null
          metadata: Json | null
          participants: string[]
          thread_name: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          booking_id?: string | null
          created_at?: string
          experience_id?: string | null
          id?: string
          is_group?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          metadata?: Json | null
          participants: string[]
          thread_name?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          booking_id?: string | null
          created_at?: string
          experience_id?: string | null
          id?: string
          is_group?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          metadata?: Json | null
          participants?: string[]
          thread_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_threads_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_threads_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_amenities: {
        Row: {
          amenity_key: string
          experience_id: string
        }
        Insert: {
          amenity_key: string
          experience_id: string
        }
        Update: {
          amenity_key?: string
          experience_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_amenities_amenity_key_fkey"
            columns: ["amenity_key"]
            isOneToOne: false
            referencedRelation: "amenities"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "experience_amenities_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_media: {
        Row: {
          caption: string | null
          created_at: string
          experience_id: string
          id: string
          media_id: string
          order_index: number | null
          role: Database["public"]["Enums"]["media_role"]
        }
        Insert: {
          caption?: string | null
          created_at?: string
          experience_id: string
          id?: string
          media_id: string
          order_index?: number | null
          role: Database["public"]["Enums"]["media_role"]
        }
        Update: {
          caption?: string | null
          created_at?: string
          experience_id?: string
          id?: string
          media_id?: string
          order_index?: number | null
          role?: Database["public"]["Enums"]["media_role"]
        }
        Relationships: [
          {
            foreignKeyName: "experience_media_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experience_media_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_services_excluded: {
        Row: {
          experience_id: string
          notes: string | null
          service_key: string
        }
        Insert: {
          experience_id: string
          notes?: string | null
          service_key: string
        }
        Update: {
          experience_id?: string
          notes?: string | null
          service_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_services_excluded_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experience_services_excluded_service_key_fkey"
            columns: ["service_key"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["key"]
          },
        ]
      }
      experience_services_included: {
        Row: {
          experience_id: string
          notes: string | null
          service_key: string
        }
        Insert: {
          experience_id: string
          notes?: string | null
          service_key: string
        }
        Update: {
          experience_id?: string
          notes?: string | null
          service_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_services_included_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experience_services_included_service_key_fkey"
            columns: ["service_key"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["key"]
          },
        ]
      }
      experiences: {
        Row: {
          address: Json | null
          avg_rating: number | null
          bookings_count: number | null
          cancellation_policy: Database["public"]["Enums"]["cancellation_policy"]
          city: string
          created_at: string
          deleted_at: string | null
          host_id: string
          id: string
          languages: string[]
          location: unknown
          long_description: string
          metadata: Json | null
          published_at: string | null
          region: string | null
          rejected_reason: string | null
          reviews_count: number | null
          saves_count: number | null
          search_vector: unknown | null
          short_description: string
          slug: string | null
          status: Database["public"]["Enums"]["experience_status"] | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          type: Database["public"]["Enums"]["experience_type"]
          updated_at: string
          video_id: string | null
          views_count: number | null
        }
        Insert: {
          address?: Json | null
          avg_rating?: number | null
          bookings_count?: number | null
          cancellation_policy?: Database["public"]["Enums"]["cancellation_policy"]
          city: string
          created_at?: string
          deleted_at?: string | null
          host_id: string
          id?: string
          languages?: string[]
          location: unknown
          long_description: string
          metadata?: Json | null
          published_at?: string | null
          region?: string | null
          rejected_reason?: string | null
          reviews_count?: number | null
          saves_count?: number | null
          search_vector?: unknown | null
          short_description: string
          slug?: string | null
          status?: Database["public"]["Enums"]["experience_status"] | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          type: Database["public"]["Enums"]["experience_type"]
          updated_at?: string
          video_id?: string | null
          views_count?: number | null
        }
        Update: {
          address?: Json | null
          avg_rating?: number | null
          bookings_count?: number | null
          cancellation_policy?: Database["public"]["Enums"]["cancellation_policy"]
          city?: string
          created_at?: string
          deleted_at?: string | null
          host_id?: string
          id?: string
          languages?: string[]
          location?: unknown
          long_description?: string
          metadata?: Json | null
          published_at?: string | null
          region?: string | null
          rejected_reason?: string | null
          reviews_count?: number | null
          saves_count?: number | null
          search_vector?: unknown | null
          short_description?: string
          slug?: string | null
          status?: Database["public"]["Enums"]["experience_status"] | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          type?: Database["public"]["Enums"]["experience_type"]
          updated_at?: string
          video_id?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "experiences_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_experiences_video"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      experiences_lodging: {
        Row: {
          accessibility_features: string[] | null
          animaux_acceptes: boolean | null
          check_in_time: string | null
          check_out_time: string | null
          created_at: string
          experience_id: string
          house_rules: string | null
          lodging_type: Database["public"]["Enums"]["lodging_type"]
          max_stay_nights: number | null
          metadata: Json | null
          min_stay_nights: number | null
          non_fumeur: boolean | null
          updated_at: string
        }
        Insert: {
          accessibility_features?: string[] | null
          animaux_acceptes?: boolean | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          experience_id: string
          house_rules?: string | null
          lodging_type: Database["public"]["Enums"]["lodging_type"]
          max_stay_nights?: number | null
          metadata?: Json | null
          min_stay_nights?: number | null
          non_fumeur?: boolean | null
          updated_at?: string
        }
        Update: {
          accessibility_features?: string[] | null
          animaux_acceptes?: boolean | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          experience_id?: string
          house_rules?: string | null
          lodging_type?: Database["public"]["Enums"]["lodging_type"]
          max_stay_nights?: number | null
          metadata?: Json | null
          min_stay_nights?: number | null
          non_fumeur?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiences_lodging_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: true
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      experiences_trip: {
        Row: {
          arrival_place: string | null
          category: Database["public"]["Enums"]["trip_category"]
          created_at: string
          currency: string
          departure_place: string
          duration_days: number | null
          duration_hours: number | null
          end_time: string | null
          experience_id: string
          group_size_max: number
          metadata: Json | null
          min_age: number | null
          min_participants: number | null
          physical_difficulty: number | null
          price_cents: number
          price_children_cents: number | null
          price_group_cents: number | null
          price_students_cents: number | null
          restrictions: string | null
          skill_level: Database["public"]["Enums"]["skill_level"] | null
          start_time: string | null
          stops: string[] | null
          updated_at: string
          what_to_bring: string | null
        }
        Insert: {
          arrival_place?: string | null
          category: Database["public"]["Enums"]["trip_category"]
          created_at?: string
          currency?: string
          departure_place: string
          duration_days?: number | null
          duration_hours?: number | null
          end_time?: string | null
          experience_id: string
          group_size_max: number
          metadata?: Json | null
          min_age?: number | null
          min_participants?: number | null
          physical_difficulty?: number | null
          price_cents: number
          price_children_cents?: number | null
          price_group_cents?: number | null
          price_students_cents?: number | null
          restrictions?: string | null
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          start_time?: string | null
          stops?: string[] | null
          updated_at?: string
          what_to_bring?: string | null
        }
        Update: {
          arrival_place?: string | null
          category?: Database["public"]["Enums"]["trip_category"]
          created_at?: string
          currency?: string
          departure_place?: string
          duration_days?: number | null
          duration_hours?: number | null
          end_time?: string | null
          experience_id?: string
          group_size_max?: number
          metadata?: Json | null
          min_age?: number | null
          min_participants?: number | null
          physical_difficulty?: number | null
          price_cents?: number
          price_children_cents?: number | null
          price_group_cents?: number | null
          price_students_cents?: number | null
          restrictions?: string | null
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          start_time?: string | null
          stops?: string[] | null
          updated_at?: string
          what_to_bring?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "experiences_trip_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: true
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          allowed_users: string[] | null
          created_at: string
          enabled: boolean | null
          key: string
          metadata: Json | null
          rollout_percentage: number | null
          updated_at: string
        }
        Insert: {
          allowed_users?: string[] | null
          created_at?: string
          enabled?: boolean | null
          key: string
          metadata?: Json | null
          rollout_percentage?: number | null
          updated_at?: string
        }
        Update: {
          allowed_users?: string[] | null
          created_at?: string
          enabled?: boolean | null
          key?: string
          metadata?: Json | null
          rollout_percentage?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          following_type: Database["public"]["Enums"]["following_type"]
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          following_type: Database["public"]["Enums"]["following_type"]
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          following_type?: Database["public"]["Enums"]["following_type"]
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      host_specialties: {
        Row: {
          created_at: string
          description: Json | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: Json | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: Json | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: Json
          updated_at?: string
        }
        Relationships: []
      }
      hosts: {
        Row: {
          address: Json | null
          avatar_url: string | null
          avg_rating: number | null
          bio: string | null
          city: string | null
          country: string
          cover_image_url: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          languages: string[] | null
          metadata: Json | null
          name: string
          owner_id: string
          phone: string | null
          response_rate: number | null
          response_time_hours: number | null
          slug: string | null
          specialty_ids: string[] | null
          status: Database["public"]["Enums"]["host_status"] | null
          total_bookings: number | null
          total_experiences: number | null
          updated_at: string
          verified: boolean | null
          website: string | null
        }
        Insert: {
          address?: Json | null
          avatar_url?: string | null
          avg_rating?: number | null
          bio?: string | null
          city?: string | null
          country: string
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          languages?: string[] | null
          metadata?: Json | null
          name: string
          owner_id: string
          phone?: string | null
          response_rate?: number | null
          response_time_hours?: number | null
          slug?: string | null
          specialty_ids?: string[] | null
          status?: Database["public"]["Enums"]["host_status"] | null
          total_bookings?: number | null
          total_experiences?: number | null
          updated_at?: string
          verified?: boolean | null
          website?: string | null
        }
        Update: {
          address?: Json | null
          avatar_url?: string | null
          avg_rating?: number | null
          bio?: string | null
          city?: string | null
          country?: string
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          languages?: string[] | null
          metadata?: Json | null
          name?: string
          owner_id?: string
          phone?: string | null
          response_rate?: number | null
          response_time_hours?: number | null
          slug?: string | null
          specialty_ids?: string[] | null
          status?: Database["public"]["Enums"]["host_status"] | null
          total_bookings?: number | null
          total_experiences?: number | null
          updated_at?: string
          verified?: boolean | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hosts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lodging_room_types: {
        Row: {
          capacity_beds: number
          created_at: string
          currency: string
          deleted_at: string | null
          description: string | null
          equipments: string[] | null
          experience_id: string
          extra_fees: Json | null
          id: string
          max_persons: number
          metadata: Json | null
          name: string | null
          photos: string[] | null
          price_cents: number
          room_type: Database["public"]["Enums"]["room_type"]
          total_rooms: number
          updated_at: string
        }
        Insert: {
          capacity_beds: number
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description?: string | null
          equipments?: string[] | null
          experience_id: string
          extra_fees?: Json | null
          id?: string
          max_persons: number
          metadata?: Json | null
          name?: string | null
          photos?: string[] | null
          price_cents: number
          room_type: Database["public"]["Enums"]["room_type"]
          total_rooms?: number
          updated_at?: string
        }
        Update: {
          capacity_beds?: number
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description?: string | null
          equipments?: string[] | null
          experience_id?: string
          extra_fees?: Json | null
          id?: string
          max_persons?: number
          metadata?: Json | null
          name?: string | null
          photos?: string[] | null
          price_cents?: number
          room_type?: Database["public"]["Enums"]["room_type"]
          total_rooms?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lodging_room_types_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      lodging_availability: {
        Row: {
          created_at: string
          date: string
          experience_id: string
          id: string
          min_stay_nights: number | null
          notes: string | null
          price_override_cents: number | null
          room_type_id: string
          rooms_available: number
          rooms_total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          experience_id: string
          id?: string
          min_stay_nights?: number | null
          notes?: string | null
          price_override_cents?: number | null
          room_type_id: string
          rooms_available: number
          rooms_total: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          experience_id?: string
          id?: string
          min_stay_nights?: number | null
          notes?: string | null
          price_override_cents?: number | null
          room_type_id?: string
          rooms_available?: number
          rooms_total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lodging_availability_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lodging_availability_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "lodging_room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_sessions: {
        Row: {
          capacity_available: number
          capacity_total: number
          created_at: string
          end_at: string | null
          experience_id: string
          id: string
          metadata: Json | null
          notes: string | null
          price_override_cents: number | null
          start_at: string
          status: string | null
          updated_at: string
        }
        Insert: {
          capacity_available: number
          capacity_total: number
          created_at?: string
          end_at?: string | null
          experience_id: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          price_override_cents?: number | null
          start_at: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          capacity_available?: number
          capacity_total?: number
          created_at?: string
          end_at?: string | null
          experience_id?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          price_override_cents?: number | null
          start_at?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_sessions_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          bucket: string | null
          created_at: string
          deleted_at: string | null
          duration_seconds: number | null
          filename: string | null
          height: number | null
          hls_playlist_url: string | null
          id: string
          kind: Database["public"]["Enums"]["media_kind"]
          metadata: Json | null
          mime_type: string | null
          owner_id: string
          path: string
          processing_status:
          | Database["public"]["Enums"]["processing_status"]
          | null
          size_bytes: number | null
          transcode_job_id: string | null
          updated_at: string
          width: number | null
        }
        Insert: {
          bucket?: string | null
          created_at?: string
          deleted_at?: string | null
          duration_seconds?: number | null
          filename?: string | null
          height?: number | null
          hls_playlist_url?: string | null
          id?: string
          kind: Database["public"]["Enums"]["media_kind"]
          metadata?: Json | null
          mime_type?: string | null
          owner_id: string
          path: string
          processing_status?:
          | Database["public"]["Enums"]["processing_status"]
          | null
          size_bytes?: number | null
          transcode_job_id?: string | null
          updated_at?: string
          width?: number | null
        }
        Update: {
          bucket?: string | null
          created_at?: string
          deleted_at?: string | null
          duration_seconds?: number | null
          filename?: string | null
          height?: number | null
          hls_playlist_url?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["media_kind"]
          metadata?: Json | null
          mime_type?: string | null
          owner_id?: string
          path?: string
          processing_status?:
          | Database["public"]["Enums"]["processing_status"]
          | null
          size_bytes?: number | null
          transcode_job_id?: string | null
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          clicked_at: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          expires_at: string | null
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          metadata: Json | null
          push_sent_at: string | null
          push_token: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          clicked_at?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["notification_kind"]
          metadata?: Json | null
          push_sent_at?: string | null
          push_token?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          clicked_at?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          metadata?: Json | null
          push_sent_at?: string | null
          push_token?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          attempted_at: string | null
          booking_id: string
          created_at: string
          currency: string
          failed_at: string | null
          failure_reason: string | null
          id: string
          idempotency_key: string | null
          metadata: Json | null
          provider: string
          provider_metadata: Json | null
          provider_ref: string | null
          refund_amount_cents: number | null
          refund_reason: string | null
          refunded_at: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          succeeded_at: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          attempted_at?: string | null
          booking_id: string
          created_at?: string
          currency: string
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          provider: string
          provider_metadata?: Json | null
          provider_ref?: string | null
          refund_amount_cents?: number | null
          refund_reason?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          succeeded_at?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          attempted_at?: string | null
          booking_id?: string
          created_at?: string
          currency?: string
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          provider?: string
          provider_metadata?: Json | null
          provider_ref?: string | null
          refund_amount_cents?: number | null
          refund_reason?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          succeeded_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          currency: string | null
          deleted_at: string | null
          display_name: string
          email_verified: boolean | null
          id: string
          is_host: boolean | null
          metadata: Json | null
          phone_verified: boolean | null
          preferred_language: string | null
          status: Database["public"]["Enums"]["profile_status"] | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          currency?: string | null
          deleted_at?: string | null
          display_name: string
          email_verified?: boolean | null
          id: string
          is_host?: boolean | null
          metadata?: Json | null
          phone_verified?: boolean | null
          preferred_language?: string | null
          status?: Database["public"]["Enums"]["profile_status"] | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          currency?: string | null
          deleted_at?: string | null
          display_name?: string
          email_verified?: boolean | null
          id?: string
          is_host?: boolean | null
          metadata?: Json | null
          phone_verified?: boolean | null
          preferred_language?: string | null
          status?: Database["public"]["Enums"]["profile_status"] | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reels: {
        Row: {
          author_id: string
          caption: string | null
          comments_count: number | null
          created_at: string
          deleted_at: string | null
          experience_id: string | null
          flag_reason: string | null
          flagged_at: string | null
          hashtags: string[] | null
          id: string
          is_featured: boolean | null
          likes_count: number | null
          metadata: Json | null
          thumbnail_path: string | null
          saves_count: number | null
          shares_count: number | null
          updated_at: string
          video_id: string
          views_count: number | null
          visibility: Database["public"]["Enums"]["reel_visibility"] | null
        }
        Insert: {
          author_id: string
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          deleted_at?: string | null
          experience_id?: string | null
          flag_reason?: string | null
          flagged_at?: string | null
          hashtags?: string[] | null
          id?: string
          is_featured?: boolean | null
          likes_count?: number | null
          metadata?: Json | null
          thumbnail_path?: string | null
          saves_count?: number | null
          shares_count?: number | null
          updated_at?: string
          video_id: string
          views_count?: number | null
          visibility?: Database["public"]["Enums"]["reel_visibility"] | null
        }
        Update: {
          author_id?: string
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          deleted_at?: string | null
          experience_id?: string | null
          flag_reason?: string | null
          flagged_at?: string | null
          hashtags?: string[] | null
          id?: string
          is_featured?: boolean | null
          likes_count?: number | null
          metadata?: Json | null
          thumbnail_path?: string | null
          saves_count?: number | null
          shares_count?: number | null
          updated_at?: string
          video_id?: string
          views_count?: number | null
          visibility?: Database["public"]["Enums"]["reel_visibility"] | null
        }
        Relationships: [
          {
            foreignKeyName: "reels_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reels_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reels_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_id: string
          booking_id: string
          created_at: string
          deleted_at: string | null
          experience_id: string
          flag_reason: string | null
          flagged_at: string | null
          host_responded_at: string | null
          host_response: string | null
          id: string
          is_verified: boolean | null
          metadata: Json | null
          photos: string[] | null
          rating_accuracy: number | null
          rating_cleanliness: number | null
          rating_communication: number | null
          rating_location: number | null
          rating_overall: number
          rating_value: number | null
          text: string
          title: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          booking_id: string
          created_at?: string
          deleted_at?: string | null
          experience_id: string
          flag_reason?: string | null
          flagged_at?: string | null
          host_responded_at?: string | null
          host_response?: string | null
          id?: string
          is_verified?: boolean | null
          metadata?: Json | null
          photos?: string[] | null
          rating_accuracy?: number | null
          rating_cleanliness?: number | null
          rating_communication?: number | null
          rating_location?: number | null
          rating_overall: number
          rating_value?: number | null
          text: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          booking_id?: string
          created_at?: string
          deleted_at?: string | null
          experience_id?: string
          flag_reason?: string | null
          flagged_at?: string | null
          host_responded_at?: string | null
          host_response?: string | null
          id?: string
          is_verified?: boolean | null
          metadata?: Json | null
          photos?: string[] | null
          rating_accuracy?: number | null
          rating_cleanliness?: number | null
          rating_communication?: number | null
          rating_location?: number | null
          rating_overall?: number
          rating_value?: number | null
          text?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string
          created_at: string
          icon: string | null
          key: string
          label_ar: string | null
          label_en: string | null
          label_fr: string
        }
        Insert: {
          category: string
          created_at?: string
          icon?: string | null
          key: string
          label_ar?: string | null
          label_en?: string | null
          label_fr: string
        }
        Update: {
          category?: string
          created_at?: string
          icon?: string | null
          key?: string
          label_ar?: string | null
          label_en?: string | null
          label_fr?: string
        }
        Relationships: []
      }
      social_likes: {
        Row: {
          created_at: string
          id: string
          target_id: string
          target_type: Database["public"]["Enums"]["like_target_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          target_type: Database["public"]["Enums"]["like_target_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          target_type?: Database["public"]["Enums"]["like_target_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_saves: {
        Row: {
          collection_name: string | null
          created_at: string
          experience_id: string
          id: string
          user_id: string
        }
        Insert: {
          collection_name?: string | null
          created_at?: string
          experience_id: string
          id?: string
          user_id: string
        }
        Update: {
          collection_name?: string | null
          created_at?: string
          experience_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_saves_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_shares: {
        Row: {
          created_at: string
          experience_id: string
          id: string
          platform: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          experience_id: string
          id?: string
          platform?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          experience_id?: string
          id?: string
          platform?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_shares_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string
          description: string
          id: string
          metadata: Json | null
          status: Database["public"]["Enums"]["ticket_status"]
          type: Database["public"]["Enums"]["issue_type"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          status?: Database["public"]["Enums"]["ticket_status"]
          type: Database["public"]["Enums"]["issue_type"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          status?: Database["public"]["Enums"]["ticket_status"]
          type?: Database["public"]["Enums"]["issue_type"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_departures: {
        Row: {
          cancellation_reason: string | null
          created_at: string
          depart_at: string
          experience_id: string
          guide_id: string | null
          guide_notes: string | null
          id: string
          price_override_cents: number | null
          return_at: string | null
          seats_available: number
          seats_total: number
          status: string | null
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          created_at?: string
          depart_at: string
          experience_id: string
          guide_id?: string | null
          guide_notes?: string | null
          id?: string
          price_override_cents?: number | null
          return_at?: string | null
          seats_available: number
          seats_total: number
          status?: string | null
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          created_at?: string
          depart_at?: string
          experience_id?: string
          guide_id?: string | null
          guide_notes?: string | null
          id?: string
          price_override_cents?: number | null
          return_at?: string | null
          seats_available?: number
          seats_total?: number
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_departures_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_departures_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_itinerary: {
        Row: {
          created_at: string
          day_number: number | null
          details: string
          duration_minutes: number | null
          experience_id: string
          id: string
          location: unknown | null
          location_name: string | null
          order_index: number
          photos: string[] | null
          time_range: unknown | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_number?: number | null
          details: string
          duration_minutes?: number | null
          experience_id: string
          id?: string
          location?: unknown | null
          location_name?: string | null
          order_index?: number
          photos?: string[] | null
          time_range?: unknown | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_number?: number | null
          details?: string
          duration_minutes?: number | null
          experience_id?: string
          id?: string
          location?: unknown | null
          location_name?: string | null
          order_index?: number
          photos?: string[] | null
          time_range?: unknown | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_itinerary_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown | null
          f_table_catalog: unknown | null
          f_table_name: unknown | null
          f_table_schema: unknown | null
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown | null
          f_table_catalog: string | null
          f_table_name: unknown | null
          f_table_schema: unknown | null
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown | null
          f_table_catalog?: string | null
          f_table_name?: unknown | null
          f_table_schema?: unknown | null
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown | null
          f_table_catalog?: string | null
          f_table_name?: unknown | null
          f_table_schema?: unknown | null
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      _postgis_scripts_pgsql_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_bestsrid: {
        Args: { "": unknown }
        Returns: number
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby: {
        Args:
        | { geog1: unknown; geog2: unknown }
        | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_covers: {
        Args:
        | { geog1: unknown; geog2: unknown }
        | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_pointoutside: {
        Args: { "": unknown }
        Returns: unknown
      }
      _st_sortablehash: {
        Args: { geom: unknown }
        Returns: number
      }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      addauth: {
        Args: { "": string }
        Returns: boolean
      }
      addgeometrycolumn: {
        Args:
        | {
          catalog_name: string
          column_name: string
          new_dim: number
          new_srid_in: number
          new_type: string
          schema_name: string
          table_name: string
          use_typmod?: boolean
        }
        | {
          column_name: string
          new_dim: number
          new_srid: number
          new_type: string
          schema_name: string
          table_name: string
          use_typmod?: boolean
        }
        | {
          column_name: string
          new_dim: number
          new_srid: number
          new_type: string
          table_name: string
          use_typmod?: boolean
        }
        Returns: string
      }
      box: {
        Args: { "": unknown } | { "": unknown }
        Returns: unknown
      }
      box2d: {
        Args: { "": unknown } | { "": unknown }
        Returns: unknown
      }
      box2d_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      box2d_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      box2df_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      box2df_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      box3d: {
        Args: { "": unknown } | { "": unknown }
        Returns: unknown
      }
      box3d_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      box3d_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      box3dtobox: {
        Args: { "": unknown }
        Returns: unknown
      }
      bytea: {
        Args: { "": unknown } | { "": unknown }
        Returns: string
      }
      disablelongtransactions: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      dropgeometrycolumn: {
        Args:
        | {
          catalog_name: string
          column_name: string
          schema_name: string
          table_name: string
        }
        | { column_name: string; schema_name: string; table_name: string }
        | { column_name: string; table_name: string }
        Returns: string
      }
      dropgeometrytable: {
        Args:
        | { catalog_name: string; schema_name: string; table_name: string }
        | { schema_name: string; table_name: string }
        | { table_name: string }
        Returns: string
      }
      enablelongtransactions: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      equals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geography: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      geography_analyze: {
        Args: { "": unknown }
        Returns: boolean
      }
      geography_gist_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      geography_gist_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      geography_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      geography_send: {
        Args: { "": unknown }
        Returns: string
      }
      geography_spgist_compress_nd: {
        Args: { "": unknown }
        Returns: unknown
      }
      geography_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      geography_typmod_out: {
        Args: { "": number }
        Returns: unknown
      }
      geometry: {
        Args:
        | { "": string }
        | { "": string }
        | { "": unknown }
        | { "": unknown }
        | { "": unknown }
        | { "": unknown }
        | { "": unknown }
        | { "": unknown }
        Returns: unknown
      }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_analyze: {
        Args: { "": unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gist_compress_2d: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_gist_compress_nd: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_gist_decompress_2d: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_gist_decompress_nd: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_gist_sortsupport_2d: {
        Args: { "": unknown }
        Returns: undefined
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_hash: {
        Args: { "": unknown }
        Returns: number
      }
      geometry_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_recv: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_send: {
        Args: { "": unknown }
        Returns: string
      }
      geometry_sortsupport: {
        Args: { "": unknown }
        Returns: undefined
      }
      geometry_spgist_compress_2d: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_spgist_compress_3d: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_spgist_compress_nd: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      geometry_typmod_out: {
        Args: { "": number }
        Returns: unknown
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometrytype: {
        Args: { "": unknown } | { "": unknown }
        Returns: string
      }
      geomfromewkb: {
        Args: { "": string }
        Returns: unknown
      }
      geomfromewkt: {
        Args: { "": string }
        Returns: unknown
      }
      get_proj4_from_srid: {
        Args: { "": number }
        Returns: string
      }
      gettransactionid: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      gidx_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gidx_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      json: {
        Args: { "": unknown }
        Returns: Json
      }
      jsonb: {
        Args: { "": unknown }
        Returns: Json
      }
      longtransactionsenabled: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      path: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_asflatgeobuf_finalfn: {
        Args: { "": unknown }
        Returns: string
      }
      pgis_asgeobuf_finalfn: {
        Args: { "": unknown }
        Returns: string
      }
      pgis_asmvt_finalfn: {
        Args: { "": unknown }
        Returns: string
      }
      pgis_asmvt_serialfn: {
        Args: { "": unknown }
        Returns: string
      }
      pgis_geometry_clusterintersecting_finalfn: {
        Args: { "": unknown }
        Returns: unknown[]
      }
      pgis_geometry_clusterwithin_finalfn: {
        Args: { "": unknown }
        Returns: unknown[]
      }
      pgis_geometry_collect_finalfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_geometry_makeline_finalfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_geometry_polygonize_finalfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_geometry_union_parallel_finalfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_geometry_union_parallel_serialfn: {
        Args: { "": unknown }
        Returns: string
      }
      point: {
        Args: { "": unknown }
        Returns: unknown
      }
      polygon: {
        Args: { "": unknown }
        Returns: unknown
      }
      populate_geometry_columns: {
        Args:
        | { tbl_oid: unknown; use_typmod?: boolean }
        | { use_typmod?: boolean }
        Returns: string
      }
      postgis_addbbox: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_dropbbox: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_extensions_upgrade: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_full_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_geos_noop: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_geos_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_getbbox: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_hasbbox: {
        Args: { "": unknown }
        Returns: boolean
      }
      postgis_index_supportfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_lib_build_date: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_lib_revision: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_lib_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_libjson_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_liblwgeom_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_libprotobuf_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_libxml_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_noop: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_proj_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_scripts_build_date: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_scripts_installed: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_scripts_released: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_svn_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_typmod_dims: {
        Args: { "": number }
        Returns: number
      }
      postgis_typmod_srid: {
        Args: { "": number }
        Returns: number
      }
      postgis_typmod_type: {
        Args: { "": number }
        Returns: string
      }
      postgis_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_wagyu_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      spheroid_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      spheroid_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlength: {
        Args: { "": unknown }
        Returns: number
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dperimeter: {
        Args: { "": unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle: {
        Args:
        | { line1: unknown; line2: unknown }
        | { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
        Returns: number
      }
      st_area: {
        Args:
        | { "": string }
        | { "": unknown }
        | { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_area2d: {
        Args: { "": unknown }
        Returns: number
      }
      st_asbinary: {
        Args: { "": unknown } | { "": unknown }
        Returns: string
      }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkb: {
        Args: { "": unknown }
        Returns: string
      }
      st_asewkt: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      st_asgeojson: {
        Args:
        | { "": string }
        | { geog: unknown; maxdecimaldigits?: number; options?: number }
        | { geom: unknown; maxdecimaldigits?: number; options?: number }
        | {
          geom_column?: string
          maxdecimaldigits?: number
          pretty_bool?: boolean
          r: Record<string, unknown>
        }
        Returns: string
      }
      st_asgml: {
        Args:
        | { "": string }
        | {
          geog: unknown
          id?: string
          maxdecimaldigits?: number
          nprefix?: string
          options?: number
        }
        | {
          geog: unknown
          id?: string
          maxdecimaldigits?: number
          nprefix?: string
          options?: number
          version: number
        }
        | {
          geom: unknown
          id?: string
          maxdecimaldigits?: number
          nprefix?: string
          options?: number
          version: number
        }
        | { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_ashexewkb: {
        Args: { "": unknown }
        Returns: string
      }
      st_askml: {
        Args:
        | { "": string }
        | { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
        | { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
        Returns: string
      }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: {
        Args: { format?: string; geom: unknown }
        Returns: string
      }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg: {
        Args:
        | { "": string }
        | { geog: unknown; maxdecimaldigits?: number; rel?: number }
        | { geom: unknown; maxdecimaldigits?: number; rel?: number }
        Returns: string
      }
      st_astext: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      st_astwkb: {
        Args:
        | {
          geom: unknown[]
          ids: number[]
          prec?: number
          prec_m?: number
          prec_z?: number
          with_boxes?: boolean
          with_sizes?: boolean
        }
        | {
          geom: unknown
          prec?: number
          prec_m?: number
          prec_z?: number
          with_boxes?: boolean
          with_sizes?: boolean
        }
        Returns: string
      }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth: {
        Args:
        | { geog1: unknown; geog2: unknown }
        | { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_boundary: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer: {
        Args:
        | { geom: unknown; options?: string; radius: number }
        | { geom: unknown; quadsegs: number; radius: number }
        Returns: unknown
      }
      st_buildarea: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_centroid: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      st_cleangeometry: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_clusterintersecting: {
        Args: { "": unknown[] }
        Returns: unknown[]
      }
      st_collect: {
        Args: { "": unknown[] } | { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collectionextract: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_collectionhomogenize: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_convexhull: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_coorddim: {
        Args: { geometry: unknown }
        Returns: number
      }
      st_coveredby: {
        Args:
        | { geog1: unknown; geog2: unknown }
        | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_covers: {
        Args:
        | { geog1: unknown; geog2: unknown }
        | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_dimension: {
        Args: { "": unknown }
        Returns: number
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance: {
        Args:
        | { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
        | { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_distancesphere: {
        Args:
        | { geom1: unknown; geom2: unknown }
        | { geom1: unknown; geom2: unknown; radius: number }
        Returns: number
      }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dump: {
        Args: { "": unknown }
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][]
      }
      st_dumppoints: {
        Args: { "": unknown }
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][]
      }
      st_dumprings: {
        Args: { "": unknown }
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][]
      }
      st_dumpsegments: {
        Args: { "": unknown }
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][]
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_endpoint: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_envelope: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_equals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_expand: {
        Args:
        | { box: unknown; dx: number; dy: number }
        | { box: unknown; dx: number; dy: number; dz?: number }
        | { dm?: number; dx: number; dy: number; dz?: number; geom: unknown }
        Returns: unknown
      }
      st_exteriorring: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_flipcoordinates: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_force2d: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_force3d: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_forcecollection: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcecurve: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcepolygonccw: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcepolygoncw: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcerhr: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcesfs: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_generatepoints: {
        Args:
        | { area: unknown; npoints: number }
        | { area: unknown; npoints: number; seed: number }
        Returns: unknown
      }
      st_geogfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geogfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_geographyfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geohash: {
        Args:
        | { geog: unknown; maxchars?: number }
        | { geom: unknown; maxchars?: number }
        Returns: string
      }
      st_geomcollfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomcollfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geometrytype: {
        Args: { "": unknown }
        Returns: string
      }
      st_geomfromewkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromewkt: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromgeojson: {
        Args: { "": Json } | { "": Json } | { "": string }
        Returns: unknown
      }
      st_geomfromgml: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromkml: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfrommarc21: {
        Args: { marc21xml: string }
        Returns: unknown
      }
      st_geomfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromtwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_gmltosql: {
        Args: { "": string }
        Returns: unknown
      }
      st_hasarc: {
        Args: { geometry: unknown }
        Returns: boolean
      }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects: {
        Args:
        | { geog1: unknown; geog2: unknown }
        | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_isclosed: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_iscollection: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_isempty: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_ispolygonccw: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_ispolygoncw: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_isring: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_issimple: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_isvalid: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
      }
      st_isvalidreason: {
        Args: { "": unknown }
        Returns: string
      }
      st_isvalidtrajectory: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_length: {
        Args:
        | { "": string }
        | { "": unknown }
        | { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_length2d: {
        Args: { "": unknown }
        Returns: number
      }
      st_letters: {
        Args: { font?: Json; letters: string }
        Returns: unknown
      }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefrommultipoint: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_linefromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_linefromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linemerge: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_linestringfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_linetocurve: {
        Args: { geometry: unknown }
        Returns: unknown
      }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_m: {
        Args: { "": unknown }
        Returns: number
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { "": unknown[] } | { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makepolygon: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { "": unknown } | { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_maximuminscribedcircle: {
        Args: { "": unknown }
        Returns: Record<string, unknown>
      }
      st_memsize: {
        Args: { "": unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_minimumboundingradius: {
        Args: { "": unknown }
        Returns: Record<string, unknown>
      }
      st_minimumclearance: {
        Args: { "": unknown }
        Returns: number
      }
      st_minimumclearanceline: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_mlinefromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_mlinefromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_mpointfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_mpointfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_mpolyfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_mpolyfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_multi: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_multilinefromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_multilinestringfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_multipointfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_multipointfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_multipolyfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_multipolygonfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_ndims: {
        Args: { "": unknown }
        Returns: number
      }
      st_node: {
        Args: { g: unknown }
        Returns: unknown
      }
      st_normalize: {
        Args: { geom: unknown }
        Returns: unknown
      }
      st_npoints: {
        Args: { "": unknown }
        Returns: number
      }
      st_nrings: {
        Args: { "": unknown }
        Returns: number
      }
      st_numgeometries: {
        Args: { "": unknown }
        Returns: number
      }
      st_numinteriorring: {
        Args: { "": unknown }
        Returns: number
      }
      st_numinteriorrings: {
        Args: { "": unknown }
        Returns: number
      }
      st_numpatches: {
        Args: { "": unknown }
        Returns: number
      }
      st_numpoints: {
        Args: { "": unknown }
        Returns: number
      }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_orientedenvelope: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { "": unknown } | { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_perimeter2d: {
        Args: { "": unknown }
        Returns: number
      }
      st_pointfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_pointfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointonsurface: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_points: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_polyfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_polygonfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_polygonfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_polygonize: {
        Args: { "": unknown[] }
        Returns: unknown
      }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: string
      }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_reverse: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid: {
        Args: { geog: unknown; srid: number } | { geom: unknown; srid: number }
        Returns: unknown
      }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shiftlongitude: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid: {
        Args: { geog: unknown } | { geom: unknown }
        Returns: number
      }
      st_startpoint: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_summary: {
        Args: { "": unknown } | { "": unknown }
        Returns: string
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_transform: {
        Args:
        | { from_proj: string; geom: unknown; to_proj: string }
        | { from_proj: string; geom: unknown; to_srid: number }
        | { geom: unknown; to_proj: string }
        Returns: unknown
      }
      st_triangulatepolygon: {
        Args: { g1: unknown }
        Returns: unknown
      }
      st_union: {
        Args:
        | { "": unknown[] }
        | { geom1: unknown; geom2: unknown }
        | { geom1: unknown; geom2: unknown; gridsize: number }
        Returns: unknown
      }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_wkbtosql: {
        Args: { wkb: string }
        Returns: unknown
      }
      st_wkttosql: {
        Args: { "": string }
        Returns: unknown
      }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      st_x: {
        Args: { "": unknown }
        Returns: number
      }
      st_xmax: {
        Args: { "": unknown }
        Returns: number
      }
      st_xmin: {
        Args: { "": unknown }
        Returns: number
      }
      st_y: {
        Args: { "": unknown }
        Returns: number
      }
      st_ymax: {
        Args: { "": unknown }
        Returns: number
      }
      st_ymin: {
        Args: { "": unknown }
        Returns: number
      }
      st_z: {
        Args: { "": unknown }
        Returns: number
      }
      st_zmax: {
        Args: { "": unknown }
        Returns: number
      }
      st_zmflag: {
        Args: { "": unknown }
        Returns: number
      }
      st_zmin: {
        Args: { "": unknown }
        Returns: number
      }
      text: {
        Args: { "": unknown }
        Returns: string
      }
      unlockrows: {
        Args: { "": string }
        Returns: number
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      booking_status:
      | "draft"
      | "pending_host"
      | "approved"
      | "declined"
      | "pending_payment"
      | "confirmed"
      | "cancelled"
      | "completed"
      | "refunded"
      cancellation_policy:
      | "free"
      | "flexible"
      | "moderate"
      | "strict"
      | "non_refundable"
      experience_status:
      | "draft"
      | "review"
      | "published"
      | "paused"
      | "rejected"
      experience_type: "lodging" | "trip" | "activity"
      following_type: "user" | "host"
      host_status: "active" | "paused" | "suspended"
      issue_type: "bug" | "performance" | "ui_ux" | "other"
      like_target_type: "experience" | "review"
      lodging_type:
      | "auberge_de_jeunesse"
      | "maison_d_hotes"
      | "riad"
      | "ecolodge"
      | "hotel"
      | "camping"
      | "autre"
      media_kind: "video" | "photo"
      media_role: "photo"
      notification_kind:
      | "booking_request"
      | "booking_confirmed"
      | "booking_cancelled"
      | "booking_created"
      | "payment_succeeded"
      | "new_message"
      | "new_review"
      | "review_response"
      | "experience_published"
      | "follow"
      | "new_follow"
      | "share_experience"
      | "like"
      | "system"
      | "like_experience"
      payment_status:
      | "pending"
      | "requires_action"
      | "processing"
      | "succeeded"
      | "failed"
      | "cancelled"
      | "refunded"
      processing_status: "pending" | "processing" | "completed" | "failed"
      profile_status: "active" | "suspended"
      reel_visibility: "public" | "unlisted" | "private"
      room_type:
      | "dortoir_mixte"
      | "dortoir_femmes"
      | "chambre_privee"
      | "suite"
      | "bungalow"
      | "tente"
      skill_level: "debutant" | "intermediaire" | "confirme" | "expert"
      trip_category:
      | "journee"
      | "randonnee"
      | "circuit"
      | "outdoor"
      | "culturel"
      | "aventure"
      | "sport"
      | "gastronomie"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown | null
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {
      booking_status: [
        "draft",
        "pending_payment",
        "confirmed",
        "cancelled",
        "completed",
        "refunded",
      ],
      cancellation_policy: [
        "free",
        "flexible",
        "moderate",
        "strict",
        "non_refundable",
      ],
      experience_status: ["draft", "review", "published", "paused", "rejected"],
      experience_type: ["lodging", "trip", "activity"],
      following_type: ["user", "host"],
      host_status: ["active", "paused", "suspended"],
      like_target_type: ["experience", "review"],
      lodging_type: [
        "auberge_de_jeunesse",
        "maison_d_hotes",
        "riad",
        "ecolodge",
        "hotel",
        "camping",
        "autre",
      ],
      media_kind: ["video", "photo"],
      media_role: ["photo"],
      notification_kind: [
        "booking_request",
        "booking_confirmed",
        "booking_cancelled",
        "payment_succeeded",
        "new_message",
        "new_review",
        "review_response",
        "experience_published",
        "follow",
        "like",
        "system",
      ],
      payment_status: [
        "pending",
        "requires_action",
        "processing",
        "succeeded",
        "failed",
        "cancelled",
        "refunded",
      ],
      processing_status: ["pending", "processing", "completed", "failed"],
      profile_status: ["active", "suspended"],
      reel_visibility: ["public", "unlisted", "private"],
      room_type: [
        "dortoir_mixte",
        "dortoir_femmes",
        "chambre_privee",
        "suite",
        "bungalow",
        "tente",
      ],
      skill_level: ["debutant", "intermediaire", "confirme", "expert"],
      trip_category: [
        "journee",
        "randonnee",
        "circuit",
        "outdoor",
        "culturel",
        "aventure",
        "sport",
        "gastronomie",
      ],
    },
  },
} as const
