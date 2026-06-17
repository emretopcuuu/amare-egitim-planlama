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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          created_at: string
          id: string
          observer_id: string
          target_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          observer_id: string
          target_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          observer_id?: string
          target_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_observer_id_fkey"
            columns: ["observer_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          admin_id: string | null
          created_at: string
          detay: Json | null
          eylem: string
          id: number
          ip: string | null
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          detay?: Json | null
          eylem: string
          id?: never
          ip?: string | null
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          detay?: Json | null
          eylem?: string
          id?: never
          ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      bosluk_ani: {
        Row: {
          created_at: string
          demolisyon: Json | null
          participant_id: string
          yeni_cumle: string | null
          yeni_cumle_at: string | null
        }
        Insert: {
          created_at?: string
          demolisyon?: Json | null
          participant_id: string
          yeni_cumle?: string | null
          yeni_cumle_at?: string | null
        }
        Update: {
          created_at?: string
          demolisyon?: Json | null
          participant_id?: string
          yeni_cumle?: string | null
          yeni_cumle_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bosluk_ani_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      churn_radar: {
        Row: {
          admin_alerted_at: string | null
          nudged_at: string | null
          participant_id: string
          updated_at: string
          voice_path: string | null
        }
        Insert: {
          admin_alerted_at?: string | null
          nudged_at?: string | null
          participant_id: string
          updated_at?: string
          voice_path?: string | null
        }
        Update: {
          admin_alerted_at?: string | null
          nudged_at?: string | null
          participant_id?: string
          updated_at?: string
          voice_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "churn_radar_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      foto_begeni: {
        Row: {
          created_at: string
          id: string
          participant_id: string
          photo_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          participant_id: string
          photo_id: string
        }
        Update: {
          created_at?: string
          id?: string
          participant_id?: string
          photo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "foto_begeni_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "foto_begeni_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      foto_yorum: {
        Row: {
          created_at: string
          id: string
          is_hidden: boolean
          participant_id: string
          photo_id: string
          yorum: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_hidden?: boolean
          participant_id: string
          photo_id: string
          yorum: string
        }
        Update: {
          created_at?: string
          id?: string
          is_hidden?: boolean
          participant_id?: string
          photo_id?: string
          yorum?: string
        }
        Relationships: [
          {
            foreignKeyName: "foto_yorum_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "foto_yorum_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      gorev_tanik: {
        Row: {
          confirmed_at: string | null
          created_at: string
          doer_id: string
          id: string
          mission_id: string
          observation: string | null
          witness_id: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          doer_id: string
          id?: string
          mission_id: string
          observation?: string | null
          witness_id: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          doer_id?: string
          id?: string
          mission_id?: string
          observation?: string | null
          witness_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gorev_tanik_doer_id_fkey"
            columns: ["doer_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gorev_tanik_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: true
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gorev_tanik_witness_id_fkey"
            columns: ["witness_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      gunluk_checkin: {
        Row: {
          created_at: string
          id: string
          notu: string | null
          participant_id: string
          tarih: string
          trait_id: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          notu?: string | null
          participant_id: string
          tarih: string
          trait_id?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          notu?: string | null
          participant_id?: string
          tarih?: string
          trait_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gunluk_checkin_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gunluk_checkin_trait_id_fkey"
            columns: ["trait_id"]
            isOneToOne: false
            referencedRelation: "traits"
            referencedColumns: ["id"]
          },
        ]
      }
      grup_odev: {
        Row: {
          aktif: boolean
          baslik: string
          created_at: string
          govde: string
          hedef: string | null
          id: string
          takim: string
          tip: string
        }
        Insert: {
          aktif?: boolean
          baslik: string
          created_at?: string
          govde: string
          hedef?: string | null
          id?: string
          takim: string
          tip?: string
        }
        Update: {
          aktif?: boolean
          baslik?: string
          created_at?: string
          govde?: string
          hedef?: string | null
          id?: string
          takim?: string
          tip?: string
        }
        Relationships: []
      }
      kocu_mesajlar: {
        Row: {
          created_at: string
          icerik: string
          id: string
          participant_id: string
          rol: string
        }
        Insert: {
          created_at?: string
          icerik: string
          id?: string
          participant_id: string
          rol: string
        }
        Update: {
          created_at?: string
          icerik?: string
          id?: string
          participant_id?: string
          rol?: string
        }
        Relationships: [
          {
            foreignKeyName: "kocu_mesajlar_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      kudos: {
        Row: {
          created_at: string
          from_id: string
          id: string
          is_hidden: boolean
          message: string
          to_id: string
        }
        Insert: {
          created_at?: string
          from_id: string
          id?: string
          is_hidden?: boolean
          message: string
          to_id: string
        }
        Update: {
          created_at?: string
          from_id?: string
          id?: string
          is_hidden?: boolean
          message?: string
          to_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kudos_from_id_fkey"
            columns: ["from_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kudos_to_id_fkey"
            columns: ["to_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string
          id: number
          ip: string
          success: boolean
        }
        Insert: {
          created_at?: string
          id?: never
          ip: string
          success: boolean
        }
        Update: {
          created_at?: string
          id?: never
          ip?: string
          success?: boolean
        }
        Relationships: []
      }
      mini360_dis: {
        Row: {
          created_at: string
          id: string
          m1: number | null
          m2: number | null
          m3: number | null
          m4: number | null
          m5: number | null
          m6: number | null
          target_id: string
          tur: number
        }
        Insert: {
          created_at?: string
          id?: string
          m1?: number | null
          m2?: number | null
          m3?: number | null
          m4?: number | null
          m5?: number | null
          m6?: number | null
          target_id: string
          tur?: number
        }
        Update: {
          created_at?: string
          id?: string
          m1?: number | null
          m2?: number | null
          m3?: number | null
          m4?: number | null
          m5?: number | null
          m6?: number | null
          target_id?: string
          tur?: number
        }
        Relationships: []
      }
      mini360_oz: {
        Row: {
          m1: number | null
          m2: number | null
          m3: number | null
          m4: number | null
          m5: number | null
          m6: number | null
          participant_id: string
          tur: number
          updated_at: string
        }
        Insert: {
          m1?: number | null
          m2?: number | null
          m3?: number | null
          m4?: number | null
          m5?: number | null
          m6?: number | null
          participant_id: string
          tur?: number
          updated_at?: string
        }
        Update: {
          m1?: number | null
          m2?: number | null
          m3?: number | null
          m4?: number | null
          m5?: number | null
          m6?: number | null
          participant_id?: string
          tur?: number
          updated_at?: string
        }
        Relationships: []
      }
      mirror_letters: {
        Row: {
          content: string
          created_at: string
          participant_id: string
          voice_path: string | null
        }
        Insert: {
          content: string
          created_at?: string
          participant_id: string
          voice_path?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          participant_id?: string
          voice_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mirror_letters_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      mirror_moments: {
        Row: {
          body: string
          created_at: string
          id: string
          participant_id: string
          seen_at: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          participant_id: string
          seen_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          participant_id?: string
          seen_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mirror_moments_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          ai_comment: string | null
          ai_score: number | null
          body: string
          carried_at: string | null
          difficulty: number
          due_at: string
          id: string
          issued_at: string
          kind: string
          lightened_at: string | null
          participant_id: string
          reflected_at: string | null
          reflection_reply: string | null
          reflection_text: string | null
          reminded_at: string | null
          responded_at: string | null
          response_text: string | null
          scored_at: string | null
          spark_points: number
          status: string
          title: string
          trait_id: number | null
          voice_path: string | null
        }
        Insert: {
          ai_comment?: string | null
          ai_score?: number | null
          body: string
          carried_at?: string | null
          difficulty?: number
          due_at: string
          id?: string
          issued_at?: string
          kind: string
          lightened_at?: string | null
          participant_id: string
          reflected_at?: string | null
          reflection_reply?: string | null
          reflection_text?: string | null
          reminded_at?: string | null
          responded_at?: string | null
          response_text?: string | null
          scored_at?: string | null
          spark_points?: number
          status?: string
          title: string
          trait_id?: number | null
          voice_path?: string | null
        }
        Update: {
          ai_comment?: string | null
          ai_score?: number | null
          body?: string
          carried_at?: string | null
          difficulty?: number
          due_at?: string
          id?: string
          issued_at?: string
          kind?: string
          lightened_at?: string | null
          participant_id?: string
          reflected_at?: string | null
          reflection_reply?: string | null
          reflection_text?: string | null
          reminded_at?: string | null
          responded_at?: string | null
          response_text?: string | null
          scored_at?: string | null
          spark_points?: number
          status?: string
          title?: string
          trait_id?: number | null
          voice_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "missions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_trait_id_fkey"
            columns: ["trait_id"]
            isOneToOne: false
            referencedRelation: "traits"
            referencedColumns: ["id"]
          },
        ]
      }
      momentum_scores: {
        Row: {
          created_at: string
          detail: Json | null
          participant_id: string
          score: number
          week_start: string
        }
        Insert: {
          created_at?: string
          detail?: Json | null
          participant_id: string
          score: number
          week_start: string
        }
        Update: {
          created_at?: string
          detail?: Json | null
          participant_id?: string
          score?: number
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "momentum_scores_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      on_farkindalik: {
        Row: {
          asama: string
          basladi_at: string | null
          created_at: string
          participant_id: string
          profil: Json
          tamamlandi_at: string | null
          updated_at: string
        }
        Insert: {
          asama?: string
          basladi_at?: string | null
          created_at?: string
          participant_id: string
          profil?: Json
          tamamlandi_at?: string | null
          updated_at?: string
        }
        Update: {
          asama?: string
          basladi_at?: string | null
          created_at?: string
          participant_id?: string
          profil?: Json
          tamamlandi_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "on_farkindalik_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      on_farkindalik_yanit: {
        Row: {
          deger_metin: string | null
          deger_sayi: number | null
          madde_kod: string
          participant_id: string
          updated_at: string
        }
        Insert: {
          deger_metin?: string | null
          deger_sayi?: number | null
          madde_kod: string
          participant_id: string
          updated_at?: string
        }
        Update: {
          deger_metin?: string | null
          deger_sayi?: number | null
          madde_kod?: string
          participant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "on_farkindalik_yanit_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      pair_messages: {
        Row: {
          created_at: string
          from_id: string
          id: string
          message: string
          pair_id: string
        }
        Insert: {
          created_at?: string
          from_id: string
          id?: string
          message: string
          pair_id: string
        }
        Update: {
          created_at?: string
          from_id?: string
          id?: string
          message?: string
          pair_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pair_messages_from_id_fkey"
            columns: ["from_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pair_messages_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: false
            referencedRelation: "pairs"
            referencedColumns: ["id"]
          },
        ]
      }
      pairs: {
        Row: {
          a_id: string
          b_id: string
          created_at: string
          id: string
        }
        Insert: {
          a_id: string
          b_id: string
          created_at?: string
          id?: string
        }
        Update: {
          a_id?: string
          b_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pairs_a_id_fkey"
            columns: ["a_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pairs_b_id_fkey"
            columns: ["b_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          camp_unlocked_at: string | null
          city: string | null
          consent_at: string | null
          created_at: string
          deletion_requested_at: string | null
          email: string | null
          full_name: string
          id: string
          login_code: string
          phone: string | null
          profil_foto_path: string | null
          role: string
          team: string | null
          yuz_fotolari: Json
        }
        Insert: {
          camp_unlocked_at?: string | null
          city?: string | null
          consent_at?: string | null
          created_at?: string
          deletion_requested_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          login_code: string
          phone?: string | null
          profil_foto_path?: string | null
          role?: string
          team?: string | null
          yuz_fotolari?: Json
        }
        Update: {
          camp_unlocked_at?: string | null
          city?: string | null
          consent_at?: string | null
          created_at?: string
          deletion_requested_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          login_code?: string
          phone?: string | null
          profil_foto_path?: string | null
          role?: string
          team?: string | null
          yuz_fotolari?: Json
        }
        Relationships: []
      }
      photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          participant_id: string
          path: string
          status: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          participant_id: string
          path: string
          status?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          participant_id?: string
          path?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      pledges: {
        Row: {
          agustos_gorusme: number
          created_at: string
          gorusme_yapilan: number
          kayit_yapilan: number
          participant_id: string
          temmuz_kayit: number
          updated_at: string
          voice_path: string | null
        }
        Insert: {
          agustos_gorusme: number
          created_at?: string
          gorusme_yapilan?: number
          kayit_yapilan?: number
          participant_id: string
          temmuz_kayit: number
          updated_at?: string
          voice_path?: string | null
        }
        Update: {
          agustos_gorusme?: number
          created_at?: string
          gorusme_yapilan?: number
          kayit_yapilan?: number
          participant_id?: string
          temmuz_kayit?: number
          updated_at?: string
          voice_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pledges_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          bottom_trait_id: number
          created_at: string
          participant_id: string
          top_trait_id: number
        }
        Insert: {
          bottom_trait_id: number
          created_at?: string
          participant_id: string
          top_trait_id: number
        }
        Update: {
          bottom_trait_id?: number
          created_at?: string
          participant_id?: string
          top_trait_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "predictions_bottom_trait_id_fkey"
            columns: ["bottom_trait_id"]
            isOneToOne: false
            referencedRelation: "traits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_top_trait_id_fkey"
            columns: ["top_trait_id"]
            isOneToOne: false
            referencedRelation: "traits"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          participant_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          participant_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      pusula: {
        Row: {
          asama: string
          baz_guven: number | null
          cekirdek_neden: Json
          created_at: string
          ic_engel: string | null
          ic_engel_kat: string | null
          mevcut_bosluk: string | null
          oncelikler: Json
          ozet: string | null
          participant_id: string
          tamamlandi_at: string | null
          updated_at: string
        }
        Insert: {
          asama?: string
          baz_guven?: number | null
          cekirdek_neden?: Json
          created_at?: string
          ic_engel?: string | null
          ic_engel_kat?: string | null
          mevcut_bosluk?: string | null
          oncelikler?: Json
          ozet?: string | null
          participant_id: string
          tamamlandi_at?: string | null
          updated_at?: string
        }
        Update: {
          asama?: string
          baz_guven?: number | null
          cekirdek_neden?: Json
          created_at?: string
          ic_engel?: string | null
          ic_engel_kat?: string | null
          mevcut_bosluk?: string | null
          oncelikler?: Json
          ozet?: string | null
          participant_id?: string
          tamamlandi_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pusula_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      pusula_mesajlar: {
        Row: {
          created_at: string
          icerik: string
          id: number
          participant_id: string
          rol: string
        }
        Insert: {
          created_at?: string
          icerik: string
          id?: never
          participant_id: string
          rol: string
        }
        Update: {
          created_at?: string
          icerik?: string
          id?: never
          participant_id?: string
          rol?: string
        }
        Relationships: [
          {
            foreignKeyName: "pusula_mesajlar_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          is_hidden: boolean
          is_self: boolean | null
          rater_id: string
          score: number
          target_id: string
          trait_id: number
          wave: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          is_self?: boolean | null
          rater_id: string
          score: number
          target_id: string
          trait_id: number
          wave: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          is_self?: boolean | null
          rater_id?: string
          score?: number
          target_id?: string
          trait_id?: number
          wave?: number
        }
        Relationships: [
          {
            foreignKeyName: "ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_trait_id_fkey"
            columns: ["trait_id"]
            isOneToOne: false
            referencedRelation: "traits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_wave_fkey"
            columns: ["wave"]
            isOneToOne: false
            referencedRelation: "waves"
            referencedColumns: ["id"]
          },
        ]
      }
      redler: {
        Row: {
          aciklama: string | null
          created_at: string
          id: number
          participant_id: string
        }
        Insert: {
          aciklama?: string | null
          created_at?: string
          id?: never
          participant_id: string
        }
        Update: {
          aciklama?: string | null
          created_at?: string
          id?: never
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redler_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_items: {
        Row: {
          created_at: string
          id: string
          location: string | null
          reveal_minutes: number
          revealed: boolean
          starts_at: string
          teaser: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          reveal_minutes?: number
          revealed?: boolean
          starts_at: string
          teaser?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          reveal_minutes?: number
          revealed?: boolean
          starts_at?: string
          teaser?: string | null
          title?: string
        }
        Relationships: []
      }
      scheduled_events: {
        Row: {
          cancelled: boolean
          created_at: string
          event_type: string
          fire_at: string
          fired: boolean
          fired_at: string | null
          id: number
          wave_id: number | null
        }
        Insert: {
          cancelled?: boolean
          created_at?: string
          event_type: string
          fire_at: string
          fired?: boolean
          fired_at?: string | null
          id?: never
          wave_id?: number | null
        }
        Update: {
          cancelled?: boolean
          created_at?: string
          event_type?: string
          fire_at?: string
          fired?: boolean
          fired_at?: string | null
          id?: never
          wave_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_events_wave_id_fkey"
            columns: ["wave_id"]
            isOneToOne: false
            referencedRelation: "waves"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      traits: {
        Row: {
          active: boolean
          id: number
          name: string
          observation_hint: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          id?: number
          name: string
          observation_hint: string
          sort_order: number
        }
        Update: {
          active?: boolean
          id?: number
          name?: string
          observation_hint?: string
          sort_order?: number
        }
        Relationships: []
      }
      voice_profiles: {
        Row: {
          beklenti: string | null
          consent: boolean
          created_at: string
          face_path: string | null
          greeting_path: string | null
          morning_date: string | null
          night_date: string | null
          participant_id: string
          photo_path: string | null
          sample_path: string | null
          soz_path: string | null
          status: string
          updated_at: string
          video_notified_at: string | null
          video_path: string | null
          video_request_id: string | null
          video_status: string
          voice_id: string | null
        }
        Insert: {
          beklenti?: string | null
          consent?: boolean
          created_at?: string
          face_path?: string | null
          greeting_path?: string | null
          morning_date?: string | null
          night_date?: string | null
          participant_id: string
          photo_path?: string | null
          sample_path?: string | null
          soz_path?: string | null
          status?: string
          updated_at?: string
          video_notified_at?: string | null
          video_path?: string | null
          video_request_id?: string | null
          video_status?: string
          voice_id?: string | null
        }
        Update: {
          beklenti?: string | null
          consent?: boolean
          created_at?: string
          face_path?: string | null
          greeting_path?: string | null
          morning_date?: string | null
          night_date?: string | null
          participant_id?: string
          photo_path?: string | null
          sample_path?: string | null
          soz_path?: string | null
          status?: string
          updated_at?: string
          video_notified_at?: string | null
          video_path?: string | null
          video_request_id?: string | null
          video_status?: string
          voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_profiles_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      waves: {
        Row: {
          closed_at: string | null
          id: number
          is_open: boolean
          name: string
          opened_at: string | null
        }
        Insert: {
          closed_at?: string | null
          id: number
          is_open?: boolean
          name: string
          opened_at?: string | null
        }
        Update: {
          closed_at?: string | null
          id?: number
          is_open?: boolean
          name?: string
          opened_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
