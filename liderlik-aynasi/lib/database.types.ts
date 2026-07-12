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
      ai_istek_log: {
        Row: {
          created_at: string
          id: number
          kaynak: string
          participant_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          kaynak: string
          participant_id: string
        }
        Update: {
          created_at?: string
          id?: never
          kaynak?: string
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_istek_log_participant_fk"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
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
      ayna_analiz: {
        Row: {
          asama: string
          created_at: string
          id: string
          metin: string
          participant_id: string
          ses_path: string | null
          updated_at: string
          yeniden_kullanildi: boolean
          yeniden_sebep: string | null
        }
        Insert: {
          asama: string
          created_at?: string
          id?: string
          metin: string
          participant_id: string
          ses_path?: string | null
          updated_at?: string
          yeniden_kullanildi?: boolean
          yeniden_sebep?: string | null
        }
        Update: {
          asama?: string
          created_at?: string
          id?: string
          metin?: string
          participant_id?: string
          ses_path?: string | null
          updated_at?: string
          yeniden_kullanildi?: boolean
          yeniden_sebep?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ayna_analiz_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      ayna_esi: {
        Row: {
          a_id: string
          a_tamam: boolean
          a_verir: number
          b_id: string
          b_tamam: boolean
          b_verir: number
          created_at: string
          id: string
          slot: string
          tur: number
        }
        Insert: {
          a_id: string
          a_tamam?: boolean
          a_verir: number
          b_id: string
          b_tamam?: boolean
          b_verir: number
          created_at?: string
          id?: string
          slot: string
          tur: number
        }
        Update: {
          a_id?: string
          a_tamam?: boolean
          a_verir?: number
          b_id?: string
          b_tamam?: boolean
          b_verir?: number
          created_at?: string
          id?: string
          slot?: string
          tur?: number
        }
        Relationships: [
          {
            foreignKeyName: "ayna_esi_a_id_fkey"
            columns: ["a_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ayna_esi_b_id_fkey"
            columns: ["b_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      ayna_tek_cumle: {
        Row: {
          created_at: string
          cumle: string
          participant_id: string
        }
        Insert: {
          created_at?: string
          cumle: string
          participant_id: string
        }
        Update: {
          created_at?: string
          cumle?: string
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ayna_tek_cumle_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      bildirimler: {
        Row: {
          baslik: string
          created_at: string
          govde: string
          id: string
          okundu_at: string | null
          participant_id: string
          url: string | null
        }
        Insert: {
          baslik: string
          created_at?: string
          govde: string
          id?: string
          okundu_at?: string | null
          participant_id: string
          url?: string | null
        }
        Update: {
          baslik?: string
          created_at?: string
          govde?: string
          id?: string
          okundu_at?: string | null
          participant_id?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bildirimler_participant_id_fkey"
            columns: ["participant_id"]
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
          wa_sent_at: string | null
        }
        Insert: {
          admin_alerted_at?: string | null
          nudged_at?: string | null
          participant_id: string
          updated_at?: string
          voice_path?: string | null
          wa_sent_at?: string | null
        }
        Update: {
          admin_alerted_at?: string | null
          nudged_at?: string | null
          participant_id?: string
          updated_at?: string
          voice_path?: string | null
          wa_sent_at?: string | null
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
      degerler_calismasi: {
        Row: {
          basladi_at: string | null
          cevaplar: Json
          neden_cumlesi: string | null
          participant_id: string
          secilen_uc: string[]
          tamamlandi_at: string | null
          updated_at: string | null
        }
        Insert: {
          basladi_at?: string | null
          cevaplar?: Json
          neden_cumlesi?: string | null
          participant_id: string
          secilen_uc?: string[]
          tamamlandi_at?: string | null
          updated_at?: string | null
        }
        Update: {
          basladi_at?: string | null
          cevaplar?: Json
          neden_cumlesi?: string | null
          participant_id?: string
          secilen_uc?: string[]
          tamamlandi_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "degerler_calismasi_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      excluded_pairs: {
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
            foreignKeyName: "excluded_pairs_a_id_fkey"
            columns: ["a_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "excluded_pairs_b_id_fkey"
            columns: ["b_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      eylul_aynasi: {
        Row: {
          cevap: string
          created_at: string
          id: string
          participant_id: string
          puan: number
        }
        Insert: {
          cevap: string
          created_at?: string
          id?: string
          participant_id: string
          puan: number
        }
        Update: {
          cevap?: string
          created_at?: string
          id?: string
          participant_id?: string
          puan?: number
        }
        Relationships: [
          {
            foreignKeyName: "eylul_aynasi_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      eylul_dis: {
        Row: {
          cevaplar: Json | null
          created_at: string
          expires_at: string
          kvkk_onay: boolean
          participant_id: string
          token: string
          used_at: string | null
          yorum: string | null
        }
        Insert: {
          cevaplar?: Json | null
          created_at?: string
          expires_at: string
          kvkk_onay?: boolean
          participant_id: string
          token: string
          used_at?: string | null
          yorum?: string | null
        }
        Update: {
          cevaplar?: Json | null
          created_at?: string
          expires_at?: string
          kvkk_onay?: boolean
          participant_id?: string
          token?: string
          used_at?: string | null
          yorum?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eylul_dis_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
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
      garantili_gorev_kayit: {
        Row: {
          created_at: string
          id: string
          kod: string
          mission_id: string | null
          participant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kod: string
          mission_id?: string | null
          participant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kod?: string
          mission_id?: string | null
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "garantili_gorev_kayit_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garantili_gorev_kayit_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      gelisim_dosyasi: {
        Row: {
          created_at: string | null
          mektup: string
          ozet: Json
          participant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          mektup: string
          ozet?: Json
          participant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          mektup?: string
          ozet?: Json
          participant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gelisim_dosyasi_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      gorev_eslesme: {
        Row: {
          created_at: string
          gercek_miydi: number | null
          hedef_id: string
          id: string
          isimli: boolean
          kaynak_id: string
          mission_id: string
        }
        Insert: {
          created_at?: string
          gercek_miydi?: number | null
          hedef_id: string
          id?: string
          isimli?: boolean
          kaynak_id: string
          mission_id: string
        }
        Update: {
          created_at?: string
          gercek_miydi?: number | null
          hedef_id?: string
          id?: string
          isimli?: boolean
          kaynak_id?: string
          mission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gorev_eslesme_hedef_id_fkey"
            columns: ["hedef_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gorev_eslesme_kaynak_id_fkey"
            columns: ["kaynak_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gorev_eslesme_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: true
            referencedRelation: "missions"
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
      grup_odev_tamam: {
        Row: {
          created_at: string
          id: string
          kanit: string
          kapatan_id: string
          odev_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kanit: string
          kapatan_id: string
          odev_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kanit?: string
          kapatan_id?: string
          odev_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grup_odev_tamam_kapatan_id_fkey"
            columns: ["kapatan_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grup_odev_tamam_odev_id_fkey"
            columns: ["odev_id"]
            isOneToOne: true
            referencedRelation: "grup_odev"
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
      hedef: {
        Row: {
          asama: string
          baslangic_detay: string | null
          baslangic_noktasi: string | null
          baslangic_ov: number | null
          baslangic_vol: number | null
          created_at: string
          deneyim_ay: number | null
          gunluk_saat: string | null
          gunluk_saat_sayi: number | null
          hedef_gelir: number | null
          hedef_rutbe: string | null
          hedefler: Json
          kariyer_seviyesi: string | null
          ozet: string | null
          participant_id: string
          plan: Json | null
          sure_ay: number | null
          tamamlandi_at: string | null
          updated_at: string
        }
        Insert: {
          asama?: string
          baslangic_detay?: string | null
          baslangic_noktasi?: string | null
          baslangic_ov?: number | null
          baslangic_vol?: number | null
          created_at?: string
          deneyim_ay?: number | null
          gunluk_saat?: string | null
          gunluk_saat_sayi?: number | null
          hedef_gelir?: number | null
          hedef_rutbe?: string | null
          hedefler?: Json
          kariyer_seviyesi?: string | null
          ozet?: string | null
          participant_id: string
          plan?: Json | null
          sure_ay?: number | null
          tamamlandi_at?: string | null
          updated_at?: string
        }
        Update: {
          asama?: string
          baslangic_detay?: string | null
          baslangic_noktasi?: string | null
          baslangic_ov?: number | null
          baslangic_vol?: number | null
          created_at?: string
          deneyim_ay?: number | null
          gunluk_saat?: string | null
          gunluk_saat_sayi?: number | null
          hedef_gelir?: number | null
          hedef_rutbe?: string | null
          hedefler?: Json
          kariyer_seviyesi?: string | null
          ozet?: string | null
          participant_id?: string
          plan?: Json | null
          sure_ay?: number | null
          tamamlandi_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hedef_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      hedef_mesajlar: {
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
            foreignKeyName: "hedef_mesajlar_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      ic_mesajlar: {
        Row: {
          admin_hedef: boolean
          alici_id: string | null
          created_at: string
          gonderen_admin: boolean
          gonderen_id: string
          govde: string
          id: string
          okundu_at: string | null
        }
        Insert: {
          admin_hedef?: boolean
          alici_id?: string | null
          created_at?: string
          gonderen_admin?: boolean
          gonderen_id: string
          govde: string
          id?: string
          okundu_at?: string | null
        }
        Update: {
          admin_hedef?: boolean
          alici_id?: string | null
          created_at?: string
          gonderen_admin?: boolean
          gonderen_id?: string
          govde?: string
          id?: string
          okundu_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ic_mesajlar_alici_id_fkey"
            columns: ["alici_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ic_mesajlar_gonderen_id_fkey"
            columns: ["gonderen_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      ikinci_ayna: {
        Row: {
          content: string
          created_at: string
          participant_id: string
        }
        Insert: {
          content: string
          created_at?: string
          participant_id: string
        }
        Update: {
          content?: string
          created_at?: string
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ikinci_ayna_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      is_verisi: {
        Row: {
          created_at: string
          gorusme: number
          hafta: number
          id: string
          kayit: number
          participant_id: string
          takip: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          gorusme?: number
          hafta: number
          id?: string
          kayit?: number
          participant_id: string
          takip?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          gorusme?: number
          hafta?: number
          id?: string
          kayit?: number
          participant_id?: string
          takip?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "is_verisi_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      kamp_arkadasi: {
        Row: {
          created_at: string
          id: string
          uyeler: string[]
        }
        Insert: {
          created_at?: string
          id?: string
          uyeler: string[]
        }
        Update: {
          created_at?: string
          id?: string
          uyeler?: string[]
        }
        Relationships: []
      }
      kamp_arkadasi_checkin: {
        Row: {
          arkadaslik_id: string
          created_at: string
          id: string
          participant_id: string
        }
        Insert: {
          arkadaslik_id: string
          created_at?: string
          id?: string
          participant_id: string
        }
        Update: {
          arkadaslik_id?: string
          created_at?: string
          id?: string
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kamp_arkadasi_checkin_arkadaslik_id_fkey"
            columns: ["arkadaslik_id"]
            isOneToOne: false
            referencedRelation: "kamp_arkadasi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kamp_arkadasi_checkin_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      kamp_senaryosu: {
        Row: {
          atesleme_zamani: string | null
          baz_olay: string | null
          created_at: string
          durum: string
          eylem_baslik: string | null
          eylem_deger: string | null
          eylem_hedef: string
          eylem_tipi: string
          gun: number | null
          id: string
          olay_kodu: string
          on_kosul: string | null
          saat: number | null
          sira: number
          sonra_dk: number | null
          tetik_tipi: string
        }
        Insert: {
          atesleme_zamani?: string | null
          baz_olay?: string | null
          created_at?: string
          durum?: string
          eylem_baslik?: string | null
          eylem_deger?: string | null
          eylem_hedef: string
          eylem_tipi: string
          gun?: number | null
          id?: string
          olay_kodu: string
          on_kosul?: string | null
          saat?: number | null
          sira?: number
          sonra_dk?: number | null
          tetik_tipi: string
        }
        Update: {
          atesleme_zamani?: string | null
          baz_olay?: string | null
          created_at?: string
          durum?: string
          eylem_baslik?: string | null
          eylem_deger?: string | null
          eylem_hedef?: string
          eylem_tipi?: string
          gun?: number | null
          id?: string
          olay_kodu?: string
          on_kosul?: string | null
          saat?: number | null
          sira?: number
          sonra_dk?: number | null
          tetik_tipi?: string
        }
        Relationships: []
      }
      kamp_taahhut: {
        Row: {
          created_at: string
          id: number
          mission_id: string | null
          ozet: string
          participant_id: string
          sayi: number | null
          tur: string
        }
        Insert: {
          created_at?: string
          id?: never
          mission_id?: string | null
          ozet: string
          participant_id: string
          sayi?: number | null
          tur?: string
        }
        Update: {
          created_at?: string
          id?: never
          mission_id?: string | null
          ozet?: string
          participant_id?: string
          sayi?: number | null
          tur?: string
        }
        Relationships: [
          {
            foreignKeyName: "kamp_taahhut_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      kanit_gorevi: {
        Row: {
          created_at: string
          gozlemci_id: string
          hedef_ad: string
          hedef_id: string
          id: string
          mission_id: string
          takdir_yazildi_at: string | null
        }
        Insert: {
          created_at?: string
          gozlemci_id: string
          hedef_ad: string
          hedef_id: string
          id?: string
          mission_id: string
          takdir_yazildi_at?: string | null
        }
        Update: {
          created_at?: string
          gozlemci_id?: string
          hedef_ad?: string
          hedef_id?: string
          id?: string
          mission_id?: string
          takdir_yazildi_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kanit_gorevi_gozlemci_id_fkey"
            columns: ["gozlemci_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanit_gorevi_hedef_id_fkey"
            columns: ["hedef_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanit_gorevi_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: true
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      kimlik_cumleleri: {
        Row: {
          birakildi_at: string | null
          created_at: string | null
          cumle: string
          id: string
          karsit_kanitlar: Json
          kaynak_mission_id: string | null
          participant_id: string
          yuzlesme_at: string | null
        }
        Insert: {
          birakildi_at?: string | null
          created_at?: string | null
          cumle: string
          id?: string
          karsit_kanitlar?: Json
          kaynak_mission_id?: string | null
          participant_id: string
          yuzlesme_at?: string | null
        }
        Update: {
          birakildi_at?: string | null
          created_at?: string | null
          cumle?: string
          id?: string
          karsit_kanitlar?: Json
          kaynak_mission_id?: string | null
          participant_id?: string
          yuzlesme_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kimlik_cumleleri_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
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
          tesekkur_edildi: boolean
          to_id: string
        }
        Insert: {
          created_at?: string
          from_id: string
          id?: string
          is_hidden?: boolean
          message: string
          tesekkur_edildi?: boolean
          to_id: string
        }
        Update: {
          created_at?: string
          from_id?: string
          id?: string
          is_hidden?: boolean
          message?: string
          tesekkur_edildi?: boolean
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
      mentorluk_kayit: {
        Row: {
          aday_idler: string[]
          created_at: string
          gun: number | null
          id: string
          konustu: boolean
          mentee_id: string
          mission_id: string | null
          secilen_id: string | null
          updated_at: string
        }
        Insert: {
          aday_idler?: string[]
          created_at?: string
          gun?: number | null
          id?: string
          konustu?: boolean
          mentee_id: string
          mission_id?: string | null
          secilen_id?: string | null
          updated_at?: string
        }
        Update: {
          aday_idler?: string[]
          created_at?: string
          gun?: number | null
          id?: string
          konustu?: boolean
          mentee_id?: string
          mission_id?: string | null
          secilen_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorluk_kayit_mentee_id_fkey"
            columns: ["mentee_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorluk_kayit_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorluk_kayit_secilen_id_fkey"
            columns: ["secilen_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
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
          rater_id: string | null
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
          rater_id?: string | null
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
          rater_id?: string | null
          target_id?: string
          tur?: number
        }
        Relationships: [
          {
            foreignKeyName: "mini360_dis_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mini360_dis_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      mini360_oz: {
        Row: {
          m1: number | null
          m2: number | null
          m3: number | null
          m4: number | null
          m5: number | null
          m6: number | null
          oylanma_istiyor: boolean
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
          oylanma_istiyor?: boolean
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
          oylanma_istiyor?: boolean
          participant_id?: string
          tur?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mini360_oz_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
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
      market_islem: {
        Row: {
          created_at: string
          fiziksel: boolean
          id: string
          participant_id: string
          reyon: string
          teslim_at: string | null
          teslim_durumu: string | null
          tutar: number
          urun_kod: string
          varyant: string | null
        }
        Insert: {
          created_at?: string
          fiziksel?: boolean
          id?: string
          participant_id: string
          reyon: string
          teslim_at?: string | null
          teslim_durumu?: string | null
          tutar: number
          urun_kod: string
          varyant?: string | null
        }
        Update: {
          created_at?: string
          fiziksel?: boolean
          id?: string
          participant_id?: string
          reyon?: string
          teslim_at?: string | null
          teslim_durumu?: string | null
          tutar?: number
          urun_kod?: string
          varyant?: string | null
        }
        Relationships: []
      }
      missions: {
        Row: {
          ai_comment: string | null
          ai_score: number | null
          altin: boolean
          baglanti_id: string | null
          bahis: boolean
          body: string
          carried_at: string | null
          cesaret_push: boolean
          david_yakalama: boolean
          difficulty: number
          domino: boolean
          donus_bicimi: string | null
          due_at: string
          ertelenme_sayisi: number
          fayda: string | null
          gec_tamamlandi: boolean
          id: string
          ipuclari: string[] | null
          issued_at: string
          kacirma_sebebi: string | null
          kapi_etiket: string | null
          kas: string | null
          kaynak_id: string | null
          kimlik_cumle_id: string | null
          kind: string
          lightened_at: string | null
          micro_sprint: boolean
          neden: string | null
          neden_nabiz: number | null
          participant_id: string
          reflected_at: string | null
          reflection_reply: string | null
          reflection_text: string | null
          reminded_at: string | null
          responded_at: string | null
          response_tags: string[] | null
          response_text: string | null
          scored_at: string | null
          secim_grubu: string | null
          somutluk: Json | null
          spark_points: number
          started_at: string | null
          status: string
          title: string
          trait_id: number | null
          voice_path: string | null
          yay_gorevi: boolean
          zincir_id: string | null
          zincir_sira: number | null
          zorluk_ayar: string | null
          zorluk_seviye: number | null
        }
        Insert: {
          ai_comment?: string | null
          ai_score?: number | null
          altin?: boolean
          baglanti_id?: string | null
          bahis?: boolean
          body: string
          carried_at?: string | null
          cesaret_push?: boolean
          david_yakalama?: boolean
          difficulty?: number
          domino?: boolean
          donus_bicimi?: string | null
          due_at: string
          ertelenme_sayisi?: number
          fayda?: string | null
          gec_tamamlandi?: boolean
          id?: string
          ipuclari?: string[] | null
          issued_at?: string
          kacirma_sebebi?: string | null
          kapi_etiket?: string | null
          kas?: string | null
          kaynak_id?: string | null
          kimlik_cumle_id?: string | null
          kind: string
          lightened_at?: string | null
          micro_sprint?: boolean
          neden?: string | null
          neden_nabiz?: number | null
          participant_id: string
          reflected_at?: string | null
          reflection_reply?: string | null
          reflection_text?: string | null
          reminded_at?: string | null
          responded_at?: string | null
          response_tags?: string[] | null
          response_text?: string | null
          scored_at?: string | null
          secim_grubu?: string | null
          somutluk?: Json | null
          spark_points?: number
          started_at?: string | null
          status?: string
          title: string
          trait_id?: number | null
          voice_path?: string | null
          yay_gorevi?: boolean
          zincir_id?: string | null
          zincir_sira?: number | null
          zorluk_ayar?: string | null
          zorluk_seviye?: number | null
        }
        Update: {
          ai_comment?: string | null
          ai_score?: number | null
          altin?: boolean
          baglanti_id?: string | null
          bahis?: boolean
          body?: string
          carried_at?: string | null
          cesaret_push?: boolean
          david_yakalama?: boolean
          difficulty?: number
          domino?: boolean
          donus_bicimi?: string | null
          due_at?: string
          ertelenme_sayisi?: number
          fayda?: string | null
          gec_tamamlandi?: boolean
          id?: string
          ipuclari?: string[] | null
          issued_at?: string
          kacirma_sebebi?: string | null
          kapi_etiket?: string | null
          kas?: string | null
          kaynak_id?: string | null
          kimlik_cumle_id?: string | null
          kind?: string
          lightened_at?: string | null
          micro_sprint?: boolean
          neden?: string | null
          neden_nabiz?: number | null
          participant_id?: string
          reflected_at?: string | null
          reflection_reply?: string | null
          reflection_text?: string | null
          reminded_at?: string | null
          responded_at?: string | null
          response_tags?: string[] | null
          response_text?: string | null
          scored_at?: string | null
          secim_grubu?: string | null
          somutluk?: Json | null
          spark_points?: number
          started_at?: string | null
          status?: string
          title?: string
          trait_id?: number | null
          voice_path?: string | null
          yay_gorevi?: boolean
          zincir_id?: string | null
          zincir_sira?: number | null
          zorluk_ayar?: string | null
          zorluk_seviye?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "missions_kaynak_id_fkey"
            columns: ["kaynak_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
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
      muhur_zinciri: {
        Row: {
          created_at: string
          halka: number
          id: string
          participant_id: string
          teyit: string
        }
        Insert: {
          created_at?: string
          halka: number
          id?: string
          participant_id: string
          teyit: string
        }
        Update: {
          created_at?: string
          halka?: number
          id?: string
          participant_id?: string
          teyit?: string
        }
        Relationships: [
          {
            foreignKeyName: "muhur_zinciri_participant_id_fkey"
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
      onboarding_hatirlatma: {
        Row: {
          created_at: string
          hedef: string
          id: number
          kanal: string
          participant_id: string
        }
        Insert: {
          created_at?: string
          hedef: string
          id?: never
          kanal?: string
          participant_id: string
        }
        Update: {
          created_at?: string
          hedef?: string
          id?: never
          kanal?: string
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_hatirlatma_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      oyun_plani: {
        Row: {
          created_at: string
          doksan_gun: Json
          durum: string
          ilk_72_saat: Json
          kirk_gun: Json
          on_gun: Json
          onaylandi_at: string | null
          ozet: string | null
          participant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doksan_gun?: Json
          durum?: string
          ilk_72_saat?: Json
          kirk_gun?: Json
          on_gun?: Json
          onaylandi_at?: string | null
          ozet?: string | null
          participant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doksan_gun?: Json
          durum?: string
          ilk_72_saat?: Json
          kirk_gun?: Json
          on_gun?: Json
          onaylandi_at?: string | null
          ozet?: string | null
          participant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "oyun_plani_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
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
          amare_puan: number | null
          ayna_lakap: string | null
          ayna_ses: string
          ayna_ses_secildi_at: string | null
          camp_unlock_token: string | null
          camp_unlocked_at: string | null
          cinsiyet: string | null
          city: string | null
          consent_at: string | null
          created_at: string
          deletion_requested_at: string | null
          donusum_karsilastirma: Json | null
          email: string | null
          en_yuksek_kariyer: string | null
          first_login_at: string | null
          full_name: string
          gecen_ay_kariyer: string | null
          gorulen_vinyetler: string[]
          id: string
          kariyer_durumu: string | null
          kariyer_seviyesi: string | null
          kidem_ay: number | null
          login_code: string
          onboarding_hatirlatma_at: string | null
          onboarding_hatirlatma_sayi: number
          onboarding_toren_at: string | null
          phone: string | null
          profil_foto_path: string | null
          role: string
          sahne_onay: boolean
          sicak_an: Json | null
          simulasyon: boolean
          son_ufuk_toren: string | null
          team: string | null
          yas: number | null
          yeniden_giris_basamak: number
          yuz_fotolari: Json
        }
        Insert: {
          amare_puan?: number | null
          ayna_lakap?: string | null
          ayna_ses?: string
          ayna_ses_secildi_at?: string | null
          camp_unlock_token?: string | null
          camp_unlocked_at?: string | null
          cinsiyet?: string | null
          city?: string | null
          consent_at?: string | null
          created_at?: string
          deletion_requested_at?: string | null
          donusum_karsilastirma?: Json | null
          email?: string | null
          en_yuksek_kariyer?: string | null
          first_login_at?: string | null
          full_name: string
          gecen_ay_kariyer?: string | null
          gorulen_vinyetler?: string[]
          id?: string
          kariyer_durumu?: string | null
          kariyer_seviyesi?: string | null
          kidem_ay?: number | null
          login_code: string
          onboarding_hatirlatma_at?: string | null
          onboarding_hatirlatma_sayi?: number
          onboarding_toren_at?: string | null
          phone?: string | null
          profil_foto_path?: string | null
          role?: string
          sahne_onay?: boolean
          sicak_an?: Json | null
          simulasyon?: boolean
          son_ufuk_toren?: string | null
          team?: string | null
          yas?: number | null
          yeniden_giris_basamak?: number
          yuz_fotolari?: Json
        }
        Update: {
          amare_puan?: number | null
          ayna_lakap?: string | null
          ayna_ses?: string
          ayna_ses_secildi_at?: string | null
          camp_unlock_token?: string | null
          camp_unlocked_at?: string | null
          cinsiyet?: string | null
          city?: string | null
          consent_at?: string | null
          created_at?: string
          deletion_requested_at?: string | null
          donusum_karsilastirma?: Json | null
          email?: string | null
          en_yuksek_kariyer?: string | null
          first_login_at?: string | null
          full_name?: string
          gecen_ay_kariyer?: string | null
          gorulen_vinyetler?: string[]
          id?: string
          kariyer_durumu?: string | null
          kariyer_seviyesi?: string | null
          kidem_ay?: number | null
          login_code?: string
          onboarding_hatirlatma_at?: string | null
          onboarding_hatirlatma_sayi?: number
          onboarding_toren_at?: string | null
          phone?: string | null
          profil_foto_path?: string | null
          role?: string
          sahne_onay?: boolean
          sicak_an?: Json | null
          simulasyon?: boolean
          son_ufuk_toren?: string | null
          team?: string | null
          yas?: number | null
          yeniden_giris_basamak?: number
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
          slogan: string | null
          slogan_adaylar: Json | null
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
          slogan?: string | null
          slogan_adaylar?: Json | null
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
          slogan?: string | null
          slogan_adaylar?: Json | null
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
      radyo_yayin: {
        Row: {
          created_at: string
          durum: string
          gun: number | null
          id: string
          metin: string
          ses_path: string | null
          slot: string
          tahmin: string | null
          tarih: string
          yayinlanan_at: string | null
        }
        Insert: {
          created_at?: string
          durum?: string
          gun?: number | null
          id?: string
          metin: string
          ses_path?: string | null
          slot: string
          tahmin?: string | null
          tarih: string
          yayinlanan_at?: string | null
        }
        Update: {
          created_at?: string
          durum?: string
          gun?: number | null
          id?: string
          metin?: string
          ses_path?: string | null
          slot?: string
          tahmin?: string | null
          tarih?: string
          yayinlanan_at?: string | null
        }
        Relationships: []
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
      rozetler: {
        Row: {
          created_at: string
          id: string
          kivilcim: number
          kod: string
          participant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kivilcim?: number
          kod: string
          participant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kivilcim?: number
          kod?: string
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rozetler_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      sahit_gozlemleri: {
        Row: {
          created_at: string | null
          gozlem: string
          gozleyen_id: string
          hedef_id: string
          id: string
          kullanildi_at: string | null
          mission_id: string | null
        }
        Insert: {
          created_at?: string | null
          gozlem: string
          gozleyen_id: string
          hedef_id: string
          id?: string
          kullanildi_at?: string | null
          mission_id?: string | null
        }
        Update: {
          created_at?: string | null
          gozlem?: string
          gozleyen_id?: string
          hedef_id?: string
          id?: string
          kullanildi_at?: string | null
          mission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sahit_gozlemleri_gozleyen_id_fkey"
            columns: ["gozleyen_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sahit_gozlemleri_hedef_id_fkey"
            columns: ["hedef_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_daveti: {
        Row: {
          created_at: string
          gonderildi_at: string | null
          hedef_ad: string
          id: string
          participant_id: string
          taslak: string
        }
        Insert: {
          created_at?: string
          gonderildi_at?: string | null
          hedef_ad: string
          id?: string
          participant_id: string
          taslak: string
        }
        Update: {
          created_at?: string
          gonderildi_at?: string | null
          hedef_ad?: string
          id?: string
          participant_id?: string
          taslak?: string
        }
        Relationships: [
          {
            foreignKeyName: "salon_daveti_participant_id_fkey"
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
      senin_icin: {
        Row: {
          created_at: string
          metin: string
          participant_id: string
        }
        Insert: {
          created_at?: string
          metin: string
          participant_id: string
        }
        Update: {
          created_at?: string
          metin?: string
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "senin_icin_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      sesli_mektuplar: {
        Row: {
          acilis_at: string
          audio_path: string
          created_at: string | null
          dinlendi_at: string | null
          id: string
          participant_id: string
          sure_sn: number | null
        }
        Insert: {
          acilis_at: string
          audio_path: string
          created_at?: string | null
          dinlendi_at?: string | null
          id?: string
          participant_id: string
          sure_sn?: number | null
        }
        Update: {
          acilis_at?: string
          audio_path?: string
          created_at?: string | null
          dinlendi_at?: string | null
          id?: string
          participant_id?: string
          sure_sn?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sesli_mektuplar_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
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
      sicak_liste: {
        Row: {
          aciklama: string | null
          created_at: string
          durum: string
          id: number
          isim: string
          participant_id: string
          sira: number
          updated_at: string
        }
        Insert: {
          aciklama?: string | null
          created_at?: string
          durum?: string
          id?: never
          isim: string
          participant_id: string
          sira?: number
          updated_at?: string
        }
        Update: {
          aciklama?: string | null
          created_at?: string
          durum?: string
          id?: never
          isim?: string
          participant_id?: string
          sira?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sicak_liste_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      soz: {
        Row: {
          aksiyonlar: Json
          created_at: string
          durum: string
          kayit_at: string | null
          metin: string | null
          participant_id: string
          sekillendi_at: string | null
          son_durtme_at: string | null
          son_tanik_uyari_at: string | null
          updated_at: string
          voice_path: string | null
        }
        Insert: {
          aksiyonlar?: Json
          created_at?: string
          durum?: string
          kayit_at?: string | null
          metin?: string | null
          participant_id: string
          sekillendi_at?: string | null
          son_durtme_at?: string | null
          son_tanik_uyari_at?: string | null
          updated_at?: string
          voice_path?: string | null
        }
        Update: {
          aksiyonlar?: Json
          created_at?: string
          durum?: string
          kayit_at?: string | null
          metin?: string | null
          participant_id?: string
          sekillendi_at?: string | null
          son_durtme_at?: string | null
          son_tanik_uyari_at?: string | null
          updated_at?: string
          voice_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "soz_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      soz_aksiyon_tamam: {
        Row: {
          aksiyon_index: number
          id: string
          participant_id: string
          tamamlandi_at: string
        }
        Insert: {
          aksiyon_index: number
          id?: string
          participant_id: string
          tamamlandi_at?: string
        }
        Update: {
          aksiyon_index?: number
          id?: string
          participant_id?: string
          tamamlandi_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "soz_aksiyon_tamam_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      soz_durtme: {
        Row: {
          created_at: string
          gonderen: string | null
          id: string
          mesaj: string | null
          sahibi: string
          tip: string
        }
        Insert: {
          created_at?: string
          gonderen?: string | null
          id?: string
          mesaj?: string | null
          sahibi: string
          tip: string
        }
        Update: {
          created_at?: string
          gonderen?: string | null
          id?: string
          mesaj?: string | null
          sahibi?: string
          tip?: string
        }
        Relationships: [
          {
            foreignKeyName: "soz_durtme_gonderen_fkey"
            columns: ["gonderen"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soz_durtme_sahibi_fkey"
            columns: ["sahibi"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      soz_takip: {
        Row: {
          created_at: string
          gorusme_sayisi: number | null
          gun: string
          id: string
          kayit_sayisi: number
          notlar: string | null
          participant_id: string
          yapildi: boolean
        }
        Insert: {
          created_at?: string
          gorusme_sayisi?: number | null
          gun: string
          id?: string
          kayit_sayisi?: number
          notlar?: string | null
          participant_id: string
          yapildi?: boolean
        }
        Update: {
          created_at?: string
          gorusme_sayisi?: number | null
          gun?: string
          id?: string
          kayit_sayisi?: number
          notlar?: string | null
          participant_id?: string
          yapildi?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "soz_takip_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      soz_tanik: {
        Row: {
          created_at: string
          id: string
          imza_at: string | null
          soz_sahibi: string
          witness_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          imza_at?: string | null
          soz_sahibi: string
          witness_id: string
        }
        Update: {
          created_at?: string
          id?: string
          imza_at?: string | null
          soz_sahibi?: string
          witness_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "soz_tanik_soz_sahibi_fkey"
            columns: ["soz_sahibi"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soz_tanik_witness_id_fkey"
            columns: ["witness_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      taahhut: {
        Row: {
          adim: number
          created_at: string
          durum: string
          id: string
          metin: string
          participant_id: string
          planlanan_zaman: string
          push_gonderildi: boolean
        }
        Insert: {
          adim: number
          created_at?: string
          durum?: string
          id?: string
          metin: string
          participant_id: string
          planlanan_zaman: string
          push_gonderildi?: boolean
        }
        Update: {
          adim?: number
          created_at?: string
          durum?: string
          id?: string
          metin?: string
          participant_id?: string
          planlanan_zaman?: string
          push_gonderildi?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "taahhut_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
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
          audio_path: string | null
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
          video_script: string | null
          video_status: string
          voice_id: string | null
        }
        Insert: {
          audio_path?: string | null
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
          video_script?: string | null
          video_status?: string
          voice_id?: string | null
        }
        Update: {
          audio_path?: string | null
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
          video_script?: string | null
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
      zirve_olcum: {
        Row: {
          created_at: string
          kelime: string
          participant_id: string
          puan: number
        }
        Insert: {
          created_at?: string
          kelime: string
          participant_id: string
          puan: number
        }
        Update: {
          created_at?: string
          kelime?: string
          participant_id?: string
          puan?: number
        }
        Relationships: [
          {
            foreignKeyName: "zirve_olcum_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      grup_ata: {
        Args: { p_adaylar: string[]; p_participant: string }
        Returns: string
      }
      yeni_kamp_hazirla: { Args: never; Returns: undefined }
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
