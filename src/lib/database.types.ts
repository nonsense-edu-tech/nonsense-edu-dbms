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
      bai_hoc: {
        Row: {
          created_at: string
          deleted_at: string | null
          hoc_phan_id: string
          id: string
          id_old: number
          ma: number
          mo_ta: string | null
          nguoi_tao: string | null
          ten: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          hoc_phan_id: string
          id?: string
          id_old?: never
          ma: number
          mo_ta?: string | null
          nguoi_tao?: string | null
          ten: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          hoc_phan_id?: string
          id?: string
          id_old?: never
          ma?: number
          mo_ta?: string | null
          nguoi_tao?: string | null
          ten?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bai_hoc_hoc_phan_id_fkey"
            columns: ["hoc_phan_id"]
            isOneToOne: false
            referencedRelation: "hoc_phan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bai_hoc_nguoi_tao_fkey"
            columns: ["nguoi_tao"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      buoi_hoc: {
        Row: {
          chi_phi_phong: number | null
          deleted_at: string | null
          gio_bat_dau: string | null
          gio_ket_thuc: string | null
          gv_id: string | null
          id: string
          lop_id: string
          mon_hoc_ma: number
          ngay: string
          phong_hoc_id: string | null
          thu_lao_gv: number | null
          trang_thai: string
        }
        Insert: {
          chi_phi_phong?: number | null
          deleted_at?: string | null
          gio_bat_dau?: string | null
          gio_ket_thuc?: string | null
          gv_id?: string | null
          id?: string
          lop_id: string
          mon_hoc_ma: number
          ngay: string
          phong_hoc_id?: string | null
          thu_lao_gv?: number | null
          trang_thai?: string
        }
        Update: {
          chi_phi_phong?: number | null
          deleted_at?: string | null
          gio_bat_dau?: string | null
          gio_ket_thuc?: string | null
          gv_id?: string | null
          id?: string
          lop_id?: string
          mon_hoc_ma?: number
          ngay?: string
          phong_hoc_id?: string | null
          thu_lao_gv?: number | null
          trang_thai?: string
        }
        Relationships: [
          {
            foreignKeyName: "buoi_hoc_gv_id_fkey"
            columns: ["gv_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buoi_hoc_lop_id_fkey"
            columns: ["lop_id"]
            isOneToOne: false
            referencedRelation: "lop"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buoi_hoc_phong_hoc_id_fkey"
            columns: ["phong_hoc_id"]
            isOneToOne: false
            referencedRelation: "phong_hoc"
            referencedColumns: ["id"]
          },
        ]
      }
      cap_hoc: {
        Row: {
          deleted_at: string | null
          id: string
          ma: number
          ten: string
        }
        Insert: {
          deleted_at?: string | null
          id?: string
          ma: number
          ten: string
        }
        Update: {
          deleted_at?: string | null
          id?: string
          ma?: number
          ten?: string
        }
        Relationships: []
      }
      cau_hoi: {
        Row: {
          bai_hoc: number | null
          cap_hoc: number | null
          cau_hoi_goc_id: string | null
          chu_de: number | null
          chuong_trinh: number | null
          created_at: string
          dang_cau: number | null
          dap_an_text: string | null
          deleted_at: string | null
          do_kho: number | null
          hoc_phan: number | null
          id: string
          loi_giai: string | null
          ma_cau_hoi: string
          mon_hoc: number | null
          ngay_duyet: string | null
          ngu_lieu_id: string | null
          nguoi_duyet: string | null
          nguoi_tao: string | null
          noi_dung: string
          phien_ban: number
          stt_cau: number | null
          tags: string[] | null
          thu_tu_trong_ngu_lieu: number | null
          ti_le_dung: number | null
          tien_trinh: string | null
          trang_thai: string
          updated_at: string
        }
        Insert: {
          bai_hoc?: number | null
          cap_hoc?: number | null
          cau_hoi_goc_id?: string | null
          chu_de?: number | null
          chuong_trinh?: number | null
          created_at?: string
          dang_cau?: number | null
          dap_an_text?: string | null
          deleted_at?: string | null
          do_kho?: number | null
          hoc_phan?: number | null
          id?: string
          loi_giai?: string | null
          ma_cau_hoi: string
          mon_hoc?: number | null
          ngay_duyet?: string | null
          ngu_lieu_id?: string | null
          nguoi_duyet?: string | null
          nguoi_tao?: string | null
          noi_dung: string
          phien_ban?: number
          stt_cau?: number | null
          tags?: string[] | null
          thu_tu_trong_ngu_lieu?: number | null
          ti_le_dung?: number | null
          tien_trinh?: string | null
          trang_thai?: string
          updated_at?: string
        }
        Update: {
          bai_hoc?: number | null
          cap_hoc?: number | null
          cau_hoi_goc_id?: string | null
          chu_de?: number | null
          chuong_trinh?: number | null
          created_at?: string
          dang_cau?: number | null
          dap_an_text?: string | null
          deleted_at?: string | null
          do_kho?: number | null
          hoc_phan?: number | null
          id?: string
          loi_giai?: string | null
          ma_cau_hoi?: string
          mon_hoc?: number | null
          ngay_duyet?: string | null
          ngu_lieu_id?: string | null
          nguoi_duyet?: string | null
          nguoi_tao?: string | null
          noi_dung?: string
          phien_ban?: number
          stt_cau?: number | null
          tags?: string[] | null
          thu_tu_trong_ngu_lieu?: number | null
          ti_le_dung?: number | null
          tien_trinh?: string | null
          trang_thai?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cau_hoi_cau_hoi_goc_id_fkey"
            columns: ["cau_hoi_goc_id"]
            isOneToOne: false
            referencedRelation: "cau_hoi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cau_hoi_ngu_lieu_id_fkey"
            columns: ["ngu_lieu_id"]
            isOneToOne: false
            referencedRelation: "ngu_lieu"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cau_hoi_nguoi_duyet_fkey"
            columns: ["nguoi_duyet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cau_hoi_nguoi_tao_fkey"
            columns: ["nguoi_tao"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cau_hoi_tien_trinh_fkey"
            columns: ["tien_trinh"]
            isOneToOne: false
            referencedRelation: "tien_trinh"
            referencedColumns: ["ma"]
          },
        ]
      }
      cau_hoi_bo_dem: {
        Row: {
          stt_ke_tiep: number
          tien_to: string
        }
        Insert: {
          stt_ke_tiep?: number
          tien_to: string
        }
        Update: {
          stt_ke_tiep?: number
          tien_to?: string
        }
        Relationships: []
      }
      cau_hoi_hinh_anh: {
        Row: {
          alt_text: string | null
          cau_hoi_id: string
          created_at: string
          duong_dan: string
          id: string
          kich_thuoc: number
          loai_mime: string
          nguoi_tao: string | null
          thu_tu: number
          thu_tu_lua_chon: number | null
          vi_tri: string
        }
        Insert: {
          alt_text?: string | null
          cau_hoi_id: string
          created_at?: string
          duong_dan: string
          id?: string
          kich_thuoc: number
          loai_mime: string
          nguoi_tao?: string | null
          thu_tu?: number
          thu_tu_lua_chon?: number | null
          vi_tri: string
        }
        Update: {
          alt_text?: string | null
          cau_hoi_id?: string
          created_at?: string
          duong_dan?: string
          id?: string
          kich_thuoc?: number
          loai_mime?: string
          nguoi_tao?: string | null
          thu_tu?: number
          thu_tu_lua_chon?: number | null
          vi_tri?: string
        }
        Relationships: [
          {
            foreignKeyName: "cau_hoi_hinh_anh_cau_hoi_id_fkey"
            columns: ["cau_hoi_id"]
            isOneToOne: false
            referencedRelation: "cau_hoi"
            referencedColumns: ["id"]
          },
        ]
      }
      cau_hoi_nang_luc: {
        Row: {
          cau_hoi_id: string
          created_at: string
          id: string
          la_chinh: boolean
          nang_luc_id: string | null
        }
        Insert: {
          cau_hoi_id: string
          created_at?: string
          id?: string
          la_chinh?: boolean
          nang_luc_id?: string | null
        }
        Update: {
          cau_hoi_id?: string
          created_at?: string
          id?: string
          la_chinh?: boolean
          nang_luc_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cau_hoi_nang_luc_cau_hoi_id_fkey"
            columns: ["cau_hoi_id"]
            isOneToOne: false
            referencedRelation: "cau_hoi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cau_hoi_nang_luc_nang_luc_id_fkey"
            columns: ["nang_luc_id"]
            isOneToOne: false
            referencedRelation: "nang_luc"
            referencedColumns: ["id"]
          },
        ]
      }
      chi_nhanh: {
        Row: {
          deleted_at: string | null
          dia_chi: string | null
          id: string
          id_old: number
          ma: string
          ten: string
        }
        Insert: {
          deleted_at?: string | null
          dia_chi?: string | null
          id?: string
          id_old?: never
          ma: string
          ten: string
        }
        Update: {
          deleted_at?: string | null
          dia_chi?: string | null
          id?: string
          id_old?: never
          ma?: string
          ten?: string
        }
        Relationships: []
      }
      chu_de: {
        Row: {
          deleted_at: string | null
          id: string
          ma: number
          mo_ta: string | null
          mon_hoc_id: string
          ten: string
        }
        Insert: {
          deleted_at?: string | null
          id?: string
          ma: number
          mo_ta?: string | null
          mon_hoc_id: string
          ten: string
        }
        Update: {
          deleted_at?: string | null
          id?: string
          ma?: number
          mo_ta?: string | null
          mon_hoc_id?: string
          ten?: string
        }
        Relationships: [
          {
            foreignKeyName: "chu_de_mon_hoc_id_fkey"
            columns: ["mon_hoc_id"]
            isOneToOne: false
            referencedRelation: "mon_hoc"
            referencedColumns: ["id"]
          },
        ]
      }
      chuong_trinh: {
        Row: {
          deleted_at: string | null
          id: string
          ma: string
          ten: string
        }
        Insert: {
          deleted_at?: string | null
          id?: string
          ma: string
          ten: string
        }
        Update: {
          deleted_at?: string | null
          id?: string
          ma?: string
          ten?: string
        }
        Relationships: []
      }
      chuong_trinh_mon_hoc: {
        Row: {
          cap_hoc_ma: number
          chuong_trinh_ma: string
          mon_hoc_ma: number
        }
        Insert: {
          cap_hoc_ma: number
          chuong_trinh_ma: string
          mon_hoc_ma: number
        }
        Update: {
          cap_hoc_ma?: number
          chuong_trinh_ma?: string
          mon_hoc_ma?: number
        }
        Relationships: [
          {
            foreignKeyName: "chuong_trinh_mon_hoc_cap_hoc_ma_mon_hoc_ma_fkey"
            columns: ["cap_hoc_ma", "mon_hoc_ma"]
            isOneToOne: false
            referencedRelation: "mon_hoc"
            referencedColumns: ["cap_hoc_ma", "ma"]
          },
          {
            foreignKeyName: "chuong_trinh_mon_hoc_chuong_trinh_ma_fkey"
            columns: ["chuong_trinh_ma"]
            isOneToOne: false
            referencedRelation: "chuong_trinh"
            referencedColumns: ["ma"]
          },
        ]
      }
      dang_bai: {
        Row: {
          id: string
          ma: string
          mien: string | null
          nang_luc_dien_hinh_id: string | null
          ten: string
          tien_trinh_dien_hinh: string | null
        }
        Insert: {
          id?: string
          ma: string
          mien?: string | null
          nang_luc_dien_hinh_id?: string | null
          ten: string
          tien_trinh_dien_hinh?: string | null
        }
        Update: {
          id?: string
          ma?: string
          mien?: string | null
          nang_luc_dien_hinh_id?: string | null
          ten?: string
          tien_trinh_dien_hinh?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dang_bai_nang_luc_dien_hinh_id_fkey"
            columns: ["nang_luc_dien_hinh_id"]
            isOneToOne: false
            referencedRelation: "nang_luc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dang_bai_tien_trinh_dien_hinh_fkey"
            columns: ["tien_trinh_dien_hinh"]
            isOneToOne: false
            referencedRelation: "tien_trinh"
            referencedColumns: ["ma"]
          },
        ]
      }
      dang_cau: {
        Row: {
          deleted_at: string | null
          id: string
          ma: number
          ten: string
        }
        Insert: {
          deleted_at?: string | null
          id?: string
          ma: number
          ten: string
        }
        Update: {
          deleted_at?: string | null
          id?: string
          ma?: number
          ten?: string
        }
        Relationships: []
      }
      danh_gia_hoc_sinh: {
        Row: {
          created_at: string
          de_id: string | null
          deleted_at: string | null
          diem_kien_thuc: number | null
          diem_ky_nang: number | null
          diem_thai_do: number | null
          ghi_chu: string | null
          hoc_sinh_id: string
          id: string
          loai_danh_gia: string
          lop_id: string | null
          mon_hoc: number | null
          nguoi_danh_gia: string | null
          ten_dot: string
          thoi_diem: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          de_id?: string | null
          deleted_at?: string | null
          diem_kien_thuc?: number | null
          diem_ky_nang?: number | null
          diem_thai_do?: number | null
          ghi_chu?: string | null
          hoc_sinh_id: string
          id?: string
          loai_danh_gia: string
          lop_id?: string | null
          mon_hoc?: number | null
          nguoi_danh_gia?: string | null
          ten_dot: string
          thoi_diem: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          de_id?: string | null
          deleted_at?: string | null
          diem_kien_thuc?: number | null
          diem_ky_nang?: number | null
          diem_thai_do?: number | null
          ghi_chu?: string | null
          hoc_sinh_id?: string
          id?: string
          loai_danh_gia?: string
          lop_id?: string | null
          mon_hoc?: number | null
          nguoi_danh_gia?: string | null
          ten_dot?: string
          thoi_diem?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "danh_gia_hoc_sinh_de_id_fkey"
            columns: ["de_id"]
            isOneToOne: false
            referencedRelation: "de"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "danh_gia_hoc_sinh_hoc_sinh_id_fkey"
            columns: ["hoc_sinh_id"]
            isOneToOne: false
            referencedRelation: "hoc_sinh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "danh_gia_hoc_sinh_hoc_sinh_id_fkey"
            columns: ["hoc_sinh_id"]
            isOneToOne: false
            referencedRelation: "v_hoc_sinh_danh_sach"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "danh_gia_hoc_sinh_lop_id_fkey"
            columns: ["lop_id"]
            isOneToOne: false
            referencedRelation: "lop"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "danh_gia_hoc_sinh_nguoi_danh_gia_fkey"
            columns: ["nguoi_danh_gia"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      danh_gia_tieu_chi: {
        Row: {
          created_at: string
          danh_gia_id: string
          id: string
          tieu_chi_id: string
        }
        Insert: {
          created_at?: string
          danh_gia_id: string
          id?: string
          tieu_chi_id: string
        }
        Update: {
          created_at?: string
          danh_gia_id?: string
          id?: string
          tieu_chi_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "danh_gia_tieu_chi_danh_gia_id_fkey"
            columns: ["danh_gia_id"]
            isOneToOne: false
            referencedRelation: "danh_gia_hoc_sinh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "danh_gia_tieu_chi_tieu_chi_id_fkey"
            columns: ["tieu_chi_id"]
            isOneToOne: false
            referencedRelation: "tieu_chi_danh_gia"
            referencedColumns: ["id"]
          },
        ]
      }
      de: {
        Row: {
          bao_cao_sinh: Json | null
          cap_hoc_ma: number | null
          chong_lap_n: number
          created_at: string
          deleted_at: string | null
          id: string
          ma_de: string | null
          ma_tran_id: string | null
          mo_ta: string | null
          mon_hoc_ma: number | null
          ngay_chot: string | null
          nguoi_chot: string | null
          nguoi_tao: string | null
          seed: string | null
          ten: string
          thoi_gian_phut: number | null
          trang_thai: string
          updated_at: string
          xao_cum: boolean
          xao_dap_an: boolean
        }
        Insert: {
          bao_cao_sinh?: Json | null
          cap_hoc_ma?: number | null
          chong_lap_n?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          ma_de?: string | null
          ma_tran_id?: string | null
          mo_ta?: string | null
          mon_hoc_ma?: number | null
          ngay_chot?: string | null
          nguoi_chot?: string | null
          nguoi_tao?: string | null
          seed?: string | null
          ten: string
          thoi_gian_phut?: number | null
          trang_thai?: string
          updated_at?: string
          xao_cum?: boolean
          xao_dap_an?: boolean
        }
        Update: {
          bao_cao_sinh?: Json | null
          cap_hoc_ma?: number | null
          chong_lap_n?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          ma_de?: string | null
          ma_tran_id?: string | null
          mo_ta?: string | null
          mon_hoc_ma?: number | null
          ngay_chot?: string | null
          nguoi_chot?: string | null
          nguoi_tao?: string | null
          seed?: string | null
          ten?: string
          thoi_gian_phut?: number | null
          trang_thai?: string
          updated_at?: string
          xao_cum?: boolean
          xao_dap_an?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "de_ma_tran_id_fkey"
            columns: ["ma_tran_id"]
            isOneToOne: false
            referencedRelation: "ma_tran_de"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "de_nguoi_tao_fkey"
            columns: ["nguoi_tao"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      de_cau_hoi: {
        Row: {
          cau_hoi_id: string
          created_at: string
          cum_id: string | null
          de_id: string
          diem: number | null
          dong_id: string | null
          id: string
          khoa: boolean
          stt_don_vi: number | null
          thu_tu: number
        }
        Insert: {
          cau_hoi_id: string
          created_at?: string
          cum_id?: string | null
          de_id: string
          diem?: number | null
          dong_id?: string | null
          id?: string
          khoa?: boolean
          stt_don_vi?: number | null
          thu_tu: number
        }
        Update: {
          cau_hoi_id?: string
          created_at?: string
          cum_id?: string | null
          de_id?: string
          diem?: number | null
          dong_id?: string | null
          id?: string
          khoa?: boolean
          stt_don_vi?: number | null
          thu_tu?: number
        }
        Relationships: [
          {
            foreignKeyName: "de_cau_hoi_cau_hoi_id_fkey"
            columns: ["cau_hoi_id"]
            isOneToOne: false
            referencedRelation: "cau_hoi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "de_cau_hoi_cum_id_fkey"
            columns: ["cum_id"]
            isOneToOne: false
            referencedRelation: "ngu_lieu"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "de_cau_hoi_de_id_fkey"
            columns: ["de_id"]
            isOneToOne: false
            referencedRelation: "de"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "de_cau_hoi_dong_id_fkey"
            columns: ["dong_id"]
            isOneToOne: false
            referencedRelation: "ma_tran_dong"
            referencedColumns: ["id"]
          },
        ]
      }
      de_cau_hoi_ban_chup: {
        Row: {
          cau_hoi_id: string
          created_at: string
          dang_cau: number | null
          dap_an_text: string | null
          de_cau_hoi_id: string
          de_id: string
          hinh_anh: Json
          loi_giai: string | null
          lua_chon: Json
          ma_cau_hoi: string
          ngu_lieu: Json | null
          noi_dung: string
        }
        Insert: {
          cau_hoi_id: string
          created_at?: string
          dang_cau?: number | null
          dap_an_text?: string | null
          de_cau_hoi_id: string
          de_id: string
          hinh_anh?: Json
          loi_giai?: string | null
          lua_chon?: Json
          ma_cau_hoi: string
          ngu_lieu?: Json | null
          noi_dung: string
        }
        Update: {
          cau_hoi_id?: string
          created_at?: string
          dang_cau?: number | null
          dap_an_text?: string | null
          de_cau_hoi_id?: string
          de_id?: string
          hinh_anh?: Json
          loi_giai?: string | null
          lua_chon?: Json
          ma_cau_hoi?: string
          ngu_lieu?: Json | null
          noi_dung?: string
        }
        Relationships: [
          {
            foreignKeyName: "de_cau_hoi_ban_chup_cau_hoi_id_fkey"
            columns: ["cau_hoi_id"]
            isOneToOne: false
            referencedRelation: "cau_hoi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "de_cau_hoi_ban_chup_de_cau_hoi_id_fkey"
            columns: ["de_cau_hoi_id"]
            isOneToOne: true
            referencedRelation: "de_cau_hoi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "de_cau_hoi_ban_chup_de_id_fkey"
            columns: ["de_id"]
            isOneToOne: false
            referencedRelation: "de"
            referencedColumns: ["id"]
          },
        ]
      }
      de_ma_de: {
        Row: {
          bo_cuc: Json
          created_at: string
          de_id: string
          id: string
          ma: string
          thu_tu: number
        }
        Insert: {
          bo_cuc: Json
          created_at?: string
          de_id: string
          id?: string
          ma: string
          thu_tu: number
        }
        Update: {
          bo_cuc?: Json
          created_at?: string
          de_id?: string
          id?: string
          ma?: string
          thu_tu?: number
        }
        Relationships: [
          {
            foreignKeyName: "de_ma_de_de_id_fkey"
            columns: ["de_id"]
            isOneToOne: false
            referencedRelation: "de"
            referencedColumns: ["id"]
          },
        ]
      }
      ghi_danh: {
        Row: {
          created_at: string
          deleted_at: string | null
          hoc_sinh_id: string
          id: string
          id_old: number
          import_batch_id: string | null
          lop_id: string
          ngay_bat_dau: string
          ngay_ket_thuc: string | null
          trang_thai: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          hoc_sinh_id: string
          id?: string
          id_old?: never
          import_batch_id?: string | null
          lop_id: string
          ngay_bat_dau?: string
          ngay_ket_thuc?: string | null
          trang_thai?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          hoc_sinh_id?: string
          id?: string
          id_old?: never
          import_batch_id?: string | null
          lop_id?: string
          ngay_bat_dau?: string
          ngay_ket_thuc?: string | null
          trang_thai?: string
        }
        Relationships: [
          {
            foreignKeyName: "ghi_danh_hoc_sinh_id_fkey"
            columns: ["hoc_sinh_id"]
            isOneToOne: false
            referencedRelation: "hoc_sinh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ghi_danh_hoc_sinh_id_fkey"
            columns: ["hoc_sinh_id"]
            isOneToOne: false
            referencedRelation: "v_hoc_sinh_danh_sach"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ghi_danh_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batch"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ghi_danh_lop_id_fkey"
            columns: ["lop_id"]
            isOneToOne: false
            referencedRelation: "lop"
            referencedColumns: ["id"]
          },
        ]
      }
      goi_hoc_phi: {
        Row: {
          chuong_trinh_ma: string
          created_at: string
          dang_ap_dung: boolean
          deleted_at: string | null
          gia_niem_yet: number
          hieu_luc_den: string | null
          hieu_luc_tu: string
          hinh_thuc_dong: string
          id: string
          id_old: number
          nguoi_tao: string | null
          ten: string
        }
        Insert: {
          chuong_trinh_ma: string
          created_at?: string
          dang_ap_dung?: boolean
          deleted_at?: string | null
          gia_niem_yet: number
          hieu_luc_den?: string | null
          hieu_luc_tu?: string
          hinh_thuc_dong: string
          id?: string
          id_old?: never
          nguoi_tao?: string | null
          ten: string
        }
        Update: {
          chuong_trinh_ma?: string
          created_at?: string
          dang_ap_dung?: boolean
          deleted_at?: string | null
          gia_niem_yet?: number
          hieu_luc_den?: string | null
          hieu_luc_tu?: string
          hinh_thuc_dong?: string
          id?: string
          id_old?: never
          nguoi_tao?: string | null
          ten?: string
        }
        Relationships: [
          {
            foreignKeyName: "goi_hoc_phi_chuong_trinh_ma_fkey"
            columns: ["chuong_trinh_ma"]
            isOneToOne: false
            referencedRelation: "chuong_trinh"
            referencedColumns: ["ma"]
          },
          {
            foreignKeyName: "goi_hoc_phi_nguoi_tao_fkey"
            columns: ["nguoi_tao"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      hinh_thuc: {
        Row: {
          deleted_at: string | null
          id: string
          ma: number
          ten: string
        }
        Insert: {
          deleted_at?: string | null
          id?: string
          ma: number
          ten: string
        }
        Update: {
          deleted_at?: string | null
          id?: string
          ma?: number
          ten?: string
        }
        Relationships: []
      }
      hoc_phan: {
        Row: {
          cap_hoc_ma: number
          created_at: string
          deleted_at: string | null
          duyet_luc: string | null
          id: string
          ly_do_tu_choi: string | null
          ma: number | null
          mo_ta: string | null
          mon_hoc_id: string
          mon_hoc_ma: number
          nguoi_duyet: string | null
          nguoi_tao: string | null
          ten: string
          trang_thai: string
          updated_at: string
        }
        Insert: {
          cap_hoc_ma: number
          created_at?: string
          deleted_at?: string | null
          duyet_luc?: string | null
          id?: string
          ly_do_tu_choi?: string | null
          ma?: number | null
          mo_ta?: string | null
          mon_hoc_id: string
          mon_hoc_ma: number
          nguoi_duyet?: string | null
          nguoi_tao?: string | null
          ten: string
          trang_thai?: string
          updated_at?: string
        }
        Update: {
          cap_hoc_ma?: number
          created_at?: string
          deleted_at?: string | null
          duyet_luc?: string | null
          id?: string
          ly_do_tu_choi?: string | null
          ma?: number | null
          mo_ta?: string | null
          mon_hoc_id?: string
          mon_hoc_ma?: number
          nguoi_duyet?: string | null
          nguoi_tao?: string | null
          ten?: string
          trang_thai?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_hocphan_mon"
            columns: ["cap_hoc_ma", "mon_hoc_ma"]
            isOneToOne: false
            referencedRelation: "mon_hoc"
            referencedColumns: ["cap_hoc_ma", "ma"]
          },
          {
            foreignKeyName: "hoc_phan_mon_hoc_id_fkey"
            columns: ["mon_hoc_id"]
            isOneToOne: false
            referencedRelation: "mon_hoc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hoc_phan_nguoi_duyet_fkey"
            columns: ["nguoi_duyet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hoc_phan_nguoi_tao_fkey"
            columns: ["nguoi_tao"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      hoc_sinh: {
        Row: {
          anh_chan_dung: string | null
          cccd: string | null
          classin_uid: string | null
          created_at: string
          deleted_at: string | null
          dia_chi: string | null
          email: string | null
          gioi_tinh: string | null
          ho_ten: string
          id: string
          id_old: number
          import_batch_id: string | null
          khoi_thi: string | null
          lop_hien_tai_id: string | null
          lop_nhap_hoc_id: string
          ma_hoc_sinh: string
          nam_sinh: number | null
          ngay_sinh: string | null
          nguoi_tao: string | null
          nv1: string | null
          sdt_hoc_sinh: string | null
          sdt_phu_huynh: string | null
          stt: number | null
          ten_phu_huynh: string | null
          tinh_trang_dang_ky: string[] | null
          truong_dai_hoc: string | null
          truong_thpt: string | null
          updated_at: string
        }
        Insert: {
          anh_chan_dung?: string | null
          cccd?: string | null
          classin_uid?: string | null
          created_at?: string
          deleted_at?: string | null
          dia_chi?: string | null
          email?: string | null
          gioi_tinh?: string | null
          ho_ten: string
          id?: string
          id_old?: never
          import_batch_id?: string | null
          khoi_thi?: string | null
          lop_hien_tai_id?: string | null
          lop_nhap_hoc_id: string
          ma_hoc_sinh: string
          nam_sinh?: number | null
          ngay_sinh?: string | null
          nguoi_tao?: string | null
          nv1?: string | null
          sdt_hoc_sinh?: string | null
          sdt_phu_huynh?: string | null
          stt?: number | null
          ten_phu_huynh?: string | null
          tinh_trang_dang_ky?: string[] | null
          truong_dai_hoc?: string | null
          truong_thpt?: string | null
          updated_at?: string
        }
        Update: {
          anh_chan_dung?: string | null
          cccd?: string | null
          classin_uid?: string | null
          created_at?: string
          deleted_at?: string | null
          dia_chi?: string | null
          email?: string | null
          gioi_tinh?: string | null
          ho_ten?: string
          id?: string
          id_old?: never
          import_batch_id?: string | null
          khoi_thi?: string | null
          lop_hien_tai_id?: string | null
          lop_nhap_hoc_id?: string
          ma_hoc_sinh?: string
          nam_sinh?: number | null
          ngay_sinh?: string | null
          nguoi_tao?: string | null
          nv1?: string | null
          sdt_hoc_sinh?: string | null
          sdt_phu_huynh?: string | null
          stt?: number | null
          ten_phu_huynh?: string | null
          tinh_trang_dang_ky?: string[] | null
          truong_dai_hoc?: string | null
          truong_thpt?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hoc_sinh_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batch"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hoc_sinh_lop_hien_tai_id_fkey"
            columns: ["lop_hien_tai_id"]
            isOneToOne: false
            referencedRelation: "lop"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hoc_sinh_lop_nhap_hoc_id_fkey"
            columns: ["lop_nhap_hoc_id"]
            isOneToOne: false
            referencedRelation: "lop"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hoc_sinh_nguoi_tao_fkey"
            columns: ["nguoi_tao"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      hop_dong_hoc_phi: {
        Row: {
          created_at: string
          deleted_at: string | null
          doanh_thu_thuan: number
          ghi_chu: string | null
          ghi_danh_id: string
          gia_niem_yet: number
          gia_tri_giam_gia: number
          goi_hoc_phi_id: string
          hinh_thuc_dong: string
          id: string
          id_old: number
          import_batch_id: string | null
          kich_hoat_luc: string | null
          loai_giam_gia: string
          nguoi_duyet: string | null
          nguoi_tao: string | null
          so_tien_giam: number
          trang_thai: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          doanh_thu_thuan: number
          ghi_chu?: string | null
          ghi_danh_id: string
          gia_niem_yet: number
          gia_tri_giam_gia?: number
          goi_hoc_phi_id: string
          hinh_thuc_dong: string
          id?: string
          id_old?: never
          import_batch_id?: string | null
          kich_hoat_luc?: string | null
          loai_giam_gia?: string
          nguoi_duyet?: string | null
          nguoi_tao?: string | null
          so_tien_giam?: number
          trang_thai?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          doanh_thu_thuan?: number
          ghi_chu?: string | null
          ghi_danh_id?: string
          gia_niem_yet?: number
          gia_tri_giam_gia?: number
          goi_hoc_phi_id?: string
          hinh_thuc_dong?: string
          id?: string
          id_old?: never
          import_batch_id?: string | null
          kich_hoat_luc?: string | null
          loai_giam_gia?: string
          nguoi_duyet?: string | null
          nguoi_tao?: string | null
          so_tien_giam?: number
          trang_thai?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hop_dong_hoc_phi_ghi_danh_id_fkey"
            columns: ["ghi_danh_id"]
            isOneToOne: false
            referencedRelation: "ghi_danh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hop_dong_hoc_phi_ghi_danh_id_fkey"
            columns: ["ghi_danh_id"]
            isOneToOne: false
            referencedRelation: "v_hoc_sinh_danh_sach"
            referencedColumns: ["ghi_danh_id"]
          },
          {
            foreignKeyName: "hop_dong_hoc_phi_goi_hoc_phi_id_fkey"
            columns: ["goi_hoc_phi_id"]
            isOneToOne: false
            referencedRelation: "goi_hoc_phi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hop_dong_hoc_phi_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batch"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hop_dong_hoc_phi_nguoi_duyet_fkey"
            columns: ["nguoi_duyet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hop_dong_hoc_phi_nguoi_tao_fkey"
            columns: ["nguoi_tao"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batch: {
        Row: {
          created_at: string
          id: string
          ten: string
        }
        Insert: {
          created_at?: string
          id?: string
          ten: string
        }
        Update: {
          created_at?: string
          id?: string
          ten?: string
        }
        Relationships: []
      }
      ky_dong_hoc_phi: {
        Row: {
          created_at: string
          hop_dong_id: string
          id: string
          id_old: number
          import_batch_id: string | null
          ngay_den_han: string
          so_ky: number
          so_tien_du_kien: number
          trang_thai: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hop_dong_id: string
          id?: string
          id_old?: never
          import_batch_id?: string | null
          ngay_den_han: string
          so_ky: number
          so_tien_du_kien: number
          trang_thai?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hop_dong_id?: string
          id?: string
          id_old?: never
          import_batch_id?: string | null
          ngay_den_han?: string
          so_ky?: number
          so_tien_du_kien?: number
          trang_thai?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ky_dong_hoc_phi_hop_dong_id_fkey"
            columns: ["hop_dong_id"]
            isOneToOne: false
            referencedRelation: "hop_dong_hoc_phi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ky_dong_hoc_phi_hop_dong_id_fkey"
            columns: ["hop_dong_id"]
            isOneToOne: false
            referencedRelation: "v_hop_dong_qua_han"
            referencedColumns: ["hop_dong_id"]
          },
          {
            foreignKeyName: "ky_dong_hoc_phi_hop_dong_id_fkey"
            columns: ["hop_dong_id"]
            isOneToOne: false
            referencedRelation: "v_tai_chinh_hop_dong"
            referencedColumns: ["hop_dong_id"]
          },
          {
            foreignKeyName: "ky_dong_hoc_phi_hop_dong_id_fkey"
            columns: ["hop_dong_id"]
            isOneToOne: false
            referencedRelation: "v_thuc_thu_hop_dong"
            referencedColumns: ["hop_dong_id"]
          },
          {
            foreignKeyName: "ky_dong_hoc_phi_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batch"
            referencedColumns: ["id"]
          },
        ]
      }
      loai_phong: {
        Row: {
          deleted_at: string | null
          don_gia_dien_nuoc_gio: number
          don_gia_khau_hao_gio: number
          don_gia_thue_gio: number
          hieu_luc_den: string | null
          hieu_luc_tu: string
          id: string
          ten: string
        }
        Insert: {
          deleted_at?: string | null
          don_gia_dien_nuoc_gio: number
          don_gia_khau_hao_gio?: number
          don_gia_thue_gio: number
          hieu_luc_den?: string | null
          hieu_luc_tu: string
          id?: string
          ten: string
        }
        Update: {
          deleted_at?: string | null
          don_gia_dien_nuoc_gio?: number
          don_gia_khau_hao_gio?: number
          don_gia_thue_gio?: number
          hieu_luc_den?: string | null
          hieu_luc_tu?: string
          id?: string
          ten?: string
        }
        Relationships: []
      }
      lop: {
        Row: {
          cap_hoc_id: string
          cap_hoc_ma: number | null
          chi_nhanh_id: string | null
          chuong_trinh_id: string
          chuong_trinh_ma: string | null
          created_at: string
          deleted_at: string | null
          id: string
          id_old: number
          import_batch_id: string | null
          khoa_nhap_hoc: number | null
          ma_lop: string
          nam_hoc: number | null
          ngay_ket_thuc: string | null
          ngay_khai_giang: string | null
          nguoi_tao: string | null
          so_lop: number | null
          ten_lop: string | null
          tinh_trang: string[] | null
        }
        Insert: {
          cap_hoc_id: string
          cap_hoc_ma?: number | null
          chi_nhanh_id?: string | null
          chuong_trinh_id: string
          chuong_trinh_ma?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          id_old?: never
          import_batch_id?: string | null
          khoa_nhap_hoc?: number | null
          ma_lop: string
          nam_hoc?: number | null
          ngay_ket_thuc?: string | null
          ngay_khai_giang?: string | null
          nguoi_tao?: string | null
          so_lop?: number | null
          ten_lop?: string | null
          tinh_trang?: string[] | null
        }
        Update: {
          cap_hoc_id?: string
          cap_hoc_ma?: number | null
          chi_nhanh_id?: string | null
          chuong_trinh_id?: string
          chuong_trinh_ma?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          id_old?: never
          import_batch_id?: string | null
          khoa_nhap_hoc?: number | null
          ma_lop?: string
          nam_hoc?: number | null
          ngay_ket_thuc?: string | null
          ngay_khai_giang?: string | null
          nguoi_tao?: string | null
          so_lop?: number | null
          ten_lop?: string | null
          tinh_trang?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_lop_cap_hoc"
            columns: ["cap_hoc_ma"]
            isOneToOne: false
            referencedRelation: "cap_hoc"
            referencedColumns: ["ma"]
          },
          {
            foreignKeyName: "fk_lop_chi_nhanh"
            columns: ["chi_nhanh_id"]
            isOneToOne: false
            referencedRelation: "chi_nhanh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_lop_chuong_trinh"
            columns: ["chuong_trinh_ma"]
            isOneToOne: false
            referencedRelation: "chuong_trinh"
            referencedColumns: ["ma"]
          },
          {
            foreignKeyName: "lop_cap_hoc_id_fkey"
            columns: ["cap_hoc_id"]
            isOneToOne: false
            referencedRelation: "cap_hoc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lop_chuong_trinh_id_fkey"
            columns: ["chuong_trinh_id"]
            isOneToOne: false
            referencedRelation: "chuong_trinh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lop_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batch"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lop_nguoi_tao_fkey"
            columns: ["nguoi_tao"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lua_chon: {
        Row: {
          cau_hoi_id: string
          created_at: string
          id: string
          la_dap_an: boolean
          noi_dung: string
          thu_tu: number
        }
        Insert: {
          cau_hoi_id: string
          created_at?: string
          id?: string
          la_dap_an?: boolean
          noi_dung: string
          thu_tu: number
        }
        Update: {
          cau_hoi_id?: string
          created_at?: string
          id?: string
          la_dap_an?: boolean
          noi_dung?: string
          thu_tu?: number
        }
        Relationships: [
          {
            foreignKeyName: "lua_chon_cau_hoi_id_fkey"
            columns: ["cau_hoi_id"]
            isOneToOne: false
            referencedRelation: "cau_hoi"
            referencedColumns: ["id"]
          },
        ]
      }
      ma_tran_de: {
        Row: {
          cap_hoc_ma: number
          created_at: string
          deleted_at: string | null
          id: string
          mo_ta: string | null
          mon_hoc_ma: number
          nguoi_tao: string
          ten: string
          updated_at: string
        }
        Insert: {
          cap_hoc_ma: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          mo_ta?: string | null
          mon_hoc_ma: number
          nguoi_tao: string
          ten: string
          updated_at?: string
        }
        Update: {
          cap_hoc_ma?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          mo_ta?: string | null
          mon_hoc_ma?: number
          nguoi_tao?: string
          ten?: string
          updated_at?: string
        }
        Relationships: []
      }
      ma_tran_dong: {
        Row: {
          bai_hoc_ma: number | null
          cau_moi_cum: number | null
          cho_phep_noi_do_kho: boolean
          chu_de_ma: number | null
          created_at: string
          dang_cau_ma: number | null
          diem_moi_cau: number | null
          do_kho_den: number
          do_kho_tu: number
          hoc_phan_ma: number | null
          id: string
          loai_ngu_lieu: string | null
          ma_tran_id: string
          nang_luc_id: string | null
          nhan: string | null
          so_luong: number
          thu_tu: number
          tien_trinh: string | null
        }
        Insert: {
          bai_hoc_ma?: number | null
          cau_moi_cum?: number | null
          cho_phep_noi_do_kho?: boolean
          chu_de_ma?: number | null
          created_at?: string
          dang_cau_ma?: number | null
          diem_moi_cau?: number | null
          do_kho_den?: number
          do_kho_tu?: number
          hoc_phan_ma?: number | null
          id?: string
          loai_ngu_lieu?: string | null
          ma_tran_id: string
          nang_luc_id?: string | null
          nhan?: string | null
          so_luong: number
          thu_tu: number
          tien_trinh?: string | null
        }
        Update: {
          bai_hoc_ma?: number | null
          cau_moi_cum?: number | null
          cho_phep_noi_do_kho?: boolean
          chu_de_ma?: number | null
          created_at?: string
          dang_cau_ma?: number | null
          diem_moi_cau?: number | null
          do_kho_den?: number
          do_kho_tu?: number
          hoc_phan_ma?: number | null
          id?: string
          loai_ngu_lieu?: string | null
          ma_tran_id?: string
          nang_luc_id?: string | null
          nhan?: string | null
          so_luong?: number
          thu_tu?: number
          tien_trinh?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ma_tran_dong_ma_tran_id_fkey"
            columns: ["ma_tran_id"]
            isOneToOne: false
            referencedRelation: "ma_tran_de"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ma_tran_dong_nang_luc_id_fkey"
            columns: ["nang_luc_id"]
            isOneToOne: false
            referencedRelation: "nang_luc"
            referencedColumns: ["id"]
          },
        ]
      }
      mon_hoc: {
        Row: {
          cap_hoc_ma: number
          deleted_at: string | null
          id: string
          ma: number
          mo_ta: string | null
          ten: string
        }
        Insert: {
          cap_hoc_ma: number
          deleted_at?: string | null
          id?: string
          ma: number
          mo_ta?: string | null
          ten: string
        }
        Update: {
          cap_hoc_ma?: number
          deleted_at?: string | null
          id?: string
          ma?: number
          mo_ta?: string | null
          ten?: string
        }
        Relationships: [
          {
            foreignKeyName: "mon_hoc_cap_hoc_ma_fkey"
            columns: ["cap_hoc_ma"]
            isOneToOne: false
            referencedRelation: "cap_hoc"
            referencedColumns: ["ma"]
          },
        ]
      }
      nang_luc: {
        Row: {
          hieu_luc_den: string | null
          hieu_luc_tu: string
          id: string
          ma_nang_luc: string
          mien: string
          mo_ta_hanh_vi: string | null
          nguon_tham_chieu: string | null
          phien_ban_khung: string
          ten: string
        }
        Insert: {
          hieu_luc_den?: string | null
          hieu_luc_tu?: string
          id?: string
          ma_nang_luc: string
          mien: string
          mo_ta_hanh_vi?: string | null
          nguon_tham_chieu?: string | null
          phien_ban_khung: string
          ten: string
        }
        Update: {
          hieu_luc_den?: string | null
          hieu_luc_tu?: string
          id?: string
          ma_nang_luc?: string
          mien?: string
          mo_ta_hanh_vi?: string | null
          nguon_tham_chieu?: string | null
          phien_ban_khung?: string
          ten?: string
        }
        Relationships: []
      }
      ngu_lieu: {
        Row: {
          bai_hoc_id: string | null
          cap_hoc_ma: number | null
          chu_de_id: string | null
          created_at: string
          deleted_at: string | null
          du_lieu: Json | null
          hoc_phan_id: string | null
          id: string
          loai: string
          mon_hoc_id: string
          mon_hoc_ma: number | null
          nguoi_tao: string | null
          noi_dung: string
          so_hieu: string
          tieu_de: string | null
          updated_at: string
        }
        Insert: {
          bai_hoc_id?: string | null
          cap_hoc_ma?: number | null
          chu_de_id?: string | null
          created_at?: string
          deleted_at?: string | null
          du_lieu?: Json | null
          hoc_phan_id?: string | null
          id?: string
          loai: string
          mon_hoc_id: string
          mon_hoc_ma?: number | null
          nguoi_tao?: string | null
          noi_dung: string
          so_hieu?: string
          tieu_de?: string | null
          updated_at?: string
        }
        Update: {
          bai_hoc_id?: string | null
          cap_hoc_ma?: number | null
          chu_de_id?: string | null
          created_at?: string
          deleted_at?: string | null
          du_lieu?: Json | null
          hoc_phan_id?: string | null
          id?: string
          loai?: string
          mon_hoc_id?: string
          mon_hoc_ma?: number | null
          nguoi_tao?: string | null
          noi_dung?: string
          so_hieu?: string
          tieu_de?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ngu_lieu_bai_hoc_id_fkey"
            columns: ["bai_hoc_id"]
            isOneToOne: false
            referencedRelation: "bai_hoc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ngu_lieu_chu_de_id_fkey"
            columns: ["chu_de_id"]
            isOneToOne: false
            referencedRelation: "chu_de"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ngu_lieu_hoc_phan_id_fkey"
            columns: ["hoc_phan_id"]
            isOneToOne: false
            referencedRelation: "hoc_phan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ngu_lieu_mon_hoc_id_fkey"
            columns: ["mon_hoc_id"]
            isOneToOne: false
            referencedRelation: "mon_hoc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ngu_lieu_nguoi_tao_fkey"
            columns: ["nguoi_tao"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      nhat_ky: {
        Row: {
          created_at: string
          doi_tuong: string
          doi_tuong_id: string | null
          hanh_dong: string
          id: string
          nguoi_dung_id: string | null
          sau: Json | null
          truoc: Json | null
        }
        Insert: {
          created_at?: string
          doi_tuong: string
          doi_tuong_id?: string | null
          hanh_dong: string
          id?: string
          nguoi_dung_id?: string | null
          sau?: Json | null
          truoc?: Json | null
        }
        Update: {
          created_at?: string
          doi_tuong?: string
          doi_tuong_id?: string | null
          hanh_dong?: string
          id?: string
          nguoi_dung_id?: string | null
          sau?: Json | null
          truoc?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "nhat_ky_nguoi_dung_id_fkey"
            columns: ["nguoi_dung_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      nhat_ky_tai_chinh: {
        Row: {
          created_at: string
          doi_tuong: string
          doi_tuong_id: string | null
          hanh_dong: string
          id: string
          nguoi_dung_id: string | null
          sau: Json | null
          truoc: Json | null
        }
        Insert: {
          created_at?: string
          doi_tuong: string
          doi_tuong_id?: string | null
          hanh_dong: string
          id?: string
          nguoi_dung_id?: string | null
          sau?: Json | null
          truoc?: Json | null
        }
        Update: {
          created_at?: string
          doi_tuong?: string
          doi_tuong_id?: string | null
          hanh_dong?: string
          id?: string
          nguoi_dung_id?: string | null
          sau?: Json | null
          truoc?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "nhat_ky_tai_chinh_nguoi_dung_id_fkey"
            columns: ["nguoi_dung_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      phan_cong_giang_day: {
        Row: {
          created_at: string
          den_ngay: string | null
          id: string
          lop_id: string
          mon_hoc_ma: number
          nguoi_tao: string | null
          tu_ngay: string
          user_id: string
        }
        Insert: {
          created_at?: string
          den_ngay?: string | null
          id?: string
          lop_id: string
          mon_hoc_ma: number
          nguoi_tao?: string | null
          tu_ngay?: string
          user_id: string
        }
        Update: {
          created_at?: string
          den_ngay?: string | null
          id?: string
          lop_id?: string
          mon_hoc_ma?: number
          nguoi_tao?: string | null
          tu_ngay?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phan_cong_giang_day_lop_id_fkey"
            columns: ["lop_id"]
            isOneToOne: false
            referencedRelation: "lop"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phan_cong_giang_day_nguoi_tao_fkey"
            columns: ["nguoi_tao"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phan_cong_giang_day_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      phieu_thu: {
        Row: {
          created_at: string
          ghi_chu: string | null
          hinh_thuc: string
          hop_dong_id: string
          id: string
          id_old: number
          import_batch_id: string | null
          ky_dong_id: string | null
          la_phieu_dao: boolean
          ma_phieu_thu: string
          ngay_thu: string
          nguoi_thu: string | null
          nguoi_thu_ten: string | null
          phieu_dao_cua_id: string | null
          so_tien: number
          tep_dinh_kem_id: string | null
          tep_dinh_kem_id_2: string | null
        }
        Insert: {
          created_at?: string
          ghi_chu?: string | null
          hinh_thuc: string
          hop_dong_id: string
          id?: string
          id_old?: never
          import_batch_id?: string | null
          ky_dong_id?: string | null
          la_phieu_dao?: boolean
          ma_phieu_thu: string
          ngay_thu?: string
          nguoi_thu?: string | null
          nguoi_thu_ten?: string | null
          phieu_dao_cua_id?: string | null
          so_tien: number
          tep_dinh_kem_id?: string | null
          tep_dinh_kem_id_2?: string | null
        }
        Update: {
          created_at?: string
          ghi_chu?: string | null
          hinh_thuc?: string
          hop_dong_id?: string
          id?: string
          id_old?: never
          import_batch_id?: string | null
          ky_dong_id?: string | null
          la_phieu_dao?: boolean
          ma_phieu_thu?: string
          ngay_thu?: string
          nguoi_thu?: string | null
          nguoi_thu_ten?: string | null
          phieu_dao_cua_id?: string | null
          so_tien?: number
          tep_dinh_kem_id?: string | null
          tep_dinh_kem_id_2?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phieu_thu_hop_dong_id_fkey"
            columns: ["hop_dong_id"]
            isOneToOne: false
            referencedRelation: "hop_dong_hoc_phi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phieu_thu_hop_dong_id_fkey"
            columns: ["hop_dong_id"]
            isOneToOne: false
            referencedRelation: "v_hop_dong_qua_han"
            referencedColumns: ["hop_dong_id"]
          },
          {
            foreignKeyName: "phieu_thu_hop_dong_id_fkey"
            columns: ["hop_dong_id"]
            isOneToOne: false
            referencedRelation: "v_tai_chinh_hop_dong"
            referencedColumns: ["hop_dong_id"]
          },
          {
            foreignKeyName: "phieu_thu_hop_dong_id_fkey"
            columns: ["hop_dong_id"]
            isOneToOne: false
            referencedRelation: "v_thuc_thu_hop_dong"
            referencedColumns: ["hop_dong_id"]
          },
          {
            foreignKeyName: "phieu_thu_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batch"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phieu_thu_ky_dong_id_fkey"
            columns: ["ky_dong_id"]
            isOneToOne: false
            referencedRelation: "ky_dong_hoc_phi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phieu_thu_nguoi_thu_fkey"
            columns: ["nguoi_thu"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phieu_thu_phieu_dao_cua_id_fkey"
            columns: ["phieu_dao_cua_id"]
            isOneToOne: false
            referencedRelation: "phieu_thu"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phieu_thu_tep_dinh_kem_id_2_fkey"
            columns: ["tep_dinh_kem_id_2"]
            isOneToOne: false
            referencedRelation: "tep_dinh_kem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phieu_thu_tep_dinh_kem_id_fkey"
            columns: ["tep_dinh_kem_id"]
            isOneToOne: false
            referencedRelation: "tep_dinh_kem"
            referencedColumns: ["id"]
          },
        ]
      }
      phong_hoc: {
        Row: {
          chi_nhanh_id: string
          deleted_at: string | null
          id: string
          loai_phong_id: string
          ten: string
        }
        Insert: {
          chi_nhanh_id: string
          deleted_at?: string | null
          id?: string
          loai_phong_id: string
          ten: string
        }
        Update: {
          chi_nhanh_id?: string
          deleted_at?: string | null
          id?: string
          loai_phong_id?: string
          ten?: string
        }
        Relationships: [
          {
            foreignKeyName: "phong_hoc_chi_nhanh_id_fkey"
            columns: ["chi_nhanh_id"]
            isOneToOne: false
            referencedRelation: "chi_nhanh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phong_hoc_loai_phong_id_fkey"
            columns: ["loai_phong_id"]
            isOneToOne: false
            referencedRelation: "loai_phong"
            referencedColumns: ["id"]
          },
        ]
      }
      tep_dinh_kem: {
        Row: {
          created_at: string
          dung_luong: number | null
          duong_dan_luu_tru: string
          id: string
          id_old: number
          loai_mime: string
          nguoi_tai_len: string | null
          ten_tep: string
        }
        Insert: {
          created_at?: string
          dung_luong?: number | null
          duong_dan_luu_tru: string
          id?: string
          id_old?: never
          loai_mime: string
          nguoi_tai_len?: string | null
          ten_tep: string
        }
        Update: {
          created_at?: string
          dung_luong?: number | null
          duong_dan_luu_tru?: string
          id?: string
          id_old?: never
          loai_mime?: string
          nguoi_tai_len?: string | null
          ten_tep?: string
        }
        Relationships: [
          {
            foreignKeyName: "tep_dinh_kem_nguoi_tai_len_fkey"
            columns: ["nguoi_tai_len"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tien_trinh: {
        Row: {
          dung_bao_cao: boolean
          ma: string
          mo_ta: string | null
          ten: string
        }
        Insert: {
          dung_bao_cao?: boolean
          ma: string
          mo_ta?: string | null
          ten: string
        }
        Update: {
          dung_bao_cao?: boolean
          ma?: string
          mo_ta?: string | null
          ten?: string
        }
        Relationships: []
      }
      tieu_chi_danh_gia: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          ma: string
          noi_dung: string
          thu_tu: number
          truc: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          ma: string
          noi_dung: string
          thu_tu?: number
          truc: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          ma?: string
          noi_dung?: string
          thu_tu?: number
          truc?: string
        }
        Relationships: []
      }
      user_bai_hoc: {
        Row: {
          bai_hoc_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          bai_hoc_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          bai_hoc_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_bai_hoc_bai_hoc_id_fkey"
            columns: ["bai_hoc_id"]
            isOneToOne: false
            referencedRelation: "bai_hoc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bai_hoc_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_chi_nhanh: {
        Row: {
          chi_nhanh_id: string
          created_at: string
          id: string
          id_old: number
          user_id: string
        }
        Insert: {
          chi_nhanh_id: string
          created_at?: string
          id?: string
          id_old?: never
          user_id: string
        }
        Update: {
          chi_nhanh_id?: string
          created_at?: string
          id?: string
          id_old?: never
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_chi_nhanh_chi_nhanh_id_fkey"
            columns: ["chi_nhanh_id"]
            isOneToOne: false
            referencedRelation: "chi_nhanh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_chi_nhanh_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_pham_vi: {
        Row: {
          cap_hoc_id: string
          cap_hoc_ma: number
          created_at: string
          id: string
          mon_hoc_id: string | null
          mon_hoc_ma: number | null
          user_id: string
        }
        Insert: {
          cap_hoc_id: string
          cap_hoc_ma: number
          created_at?: string
          id?: string
          mon_hoc_id?: string | null
          mon_hoc_ma?: number | null
          user_id: string
        }
        Update: {
          cap_hoc_id?: string
          cap_hoc_ma?: number
          created_at?: string
          id?: string
          mon_hoc_id?: string | null
          mon_hoc_ma?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_upv_mon_hoc"
            columns: ["cap_hoc_ma", "mon_hoc_ma"]
            isOneToOne: false
            referencedRelation: "mon_hoc"
            referencedColumns: ["cap_hoc_ma", "ma"]
          },
          {
            foreignKeyName: "user_pham_vi_cap_hoc_id_fkey"
            columns: ["cap_hoc_id"]
            isOneToOne: false
            referencedRelation: "cap_hoc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_pham_vi_cap_hoc_ma_fkey"
            columns: ["cap_hoc_ma"]
            isOneToOne: false
            referencedRelation: "cap_hoc"
            referencedColumns: ["ma"]
          },
          {
            foreignKeyName: "user_pham_vi_mon_hoc_id_fkey"
            columns: ["mon_hoc_id"]
            isOneToOne: false
            referencedRelation: "mon_hoc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_pham_vi_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          deleted_at: string | null
          email: string
          ho_ten: string | null
          id: string
          phai_doi_mat_khau: boolean
          trang_thai: string
          vai_tro: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email: string
          ho_ten?: string | null
          id: string
          phai_doi_mat_khau?: boolean
          trang_thai?: string
          vai_tro?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string
          ho_ten?: string | null
          id?: string
          phai_doi_mat_khau?: boolean
          trang_thai?: string
          vai_tro?: string
        }
        Relationships: []
      }
    }
    Views: {
      buoi_hoc_chi_phi: {
        Row: {
          chi_phi_phong: number | null
          deleted_at: string | null
          gio_bat_dau: string | null
          gio_ket_thuc: string | null
          gv_id: string | null
          id: string | null
          lop_id: string | null
          mon_hoc_ma: number | null
          ngay: string | null
          phong_hoc_id: string | null
          thu_lao_gv: number | null
          trang_thai: string | null
        }
        Insert: {
          chi_phi_phong?: number | null
          deleted_at?: string | null
          gio_bat_dau?: string | null
          gio_ket_thuc?: string | null
          gv_id?: string | null
          id?: string | null
          lop_id?: string | null
          mon_hoc_ma?: number | null
          ngay?: string | null
          phong_hoc_id?: string | null
          thu_lao_gv?: number | null
          trang_thai?: string | null
        }
        Update: {
          chi_phi_phong?: number | null
          deleted_at?: string | null
          gio_bat_dau?: string | null
          gio_ket_thuc?: string | null
          gv_id?: string | null
          id?: string | null
          lop_id?: string | null
          mon_hoc_ma?: number | null
          ngay?: string | null
          phong_hoc_id?: string | null
          thu_lao_gv?: number | null
          trang_thai?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buoi_hoc_gv_id_fkey"
            columns: ["gv_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buoi_hoc_lop_id_fkey"
            columns: ["lop_id"]
            isOneToOne: false
            referencedRelation: "lop"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buoi_hoc_phong_hoc_id_fkey"
            columns: ["phong_hoc_id"]
            isOneToOne: false
            referencedRelation: "phong_hoc"
            referencedColumns: ["id"]
          },
        ]
      }
      buoi_hoc_lich: {
        Row: {
          deleted_at: string | null
          gio_bat_dau: string | null
          gio_ket_thuc: string | null
          gv_id: string | null
          id: string | null
          lop_id: string | null
          mon_hoc_ma: number | null
          ngay: string | null
          phong_hoc_id: string | null
          trang_thai: string | null
        }
        Insert: {
          deleted_at?: string | null
          gio_bat_dau?: string | null
          gio_ket_thuc?: string | null
          gv_id?: string | null
          id?: string | null
          lop_id?: string | null
          mon_hoc_ma?: number | null
          ngay?: string | null
          phong_hoc_id?: string | null
          trang_thai?: string | null
        }
        Update: {
          deleted_at?: string | null
          gio_bat_dau?: string | null
          gio_ket_thuc?: string | null
          gv_id?: string | null
          id?: string | null
          lop_id?: string | null
          mon_hoc_ma?: number | null
          ngay?: string | null
          phong_hoc_id?: string | null
          trang_thai?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buoi_hoc_gv_id_fkey"
            columns: ["gv_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buoi_hoc_lop_id_fkey"
            columns: ["lop_id"]
            isOneToOne: false
            referencedRelation: "lop"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buoi_hoc_phong_hoc_id_fkey"
            columns: ["phong_hoc_id"]
            isOneToOne: false
            referencedRelation: "phong_hoc"
            referencedColumns: ["id"]
          },
        ]
      }
      v_hoc_sinh_danh_sach: {
        Row: {
          cccd: string | null
          created_at: string | null
          dia_chi: string | null
          email: string | null
          ghi_danh_id: string | null
          gioi_tinh: string | null
          ho_ten: string | null
          id: string | null
          khoi_thi: string | null
          lop_hien_tai_id: string | null
          ma_hoc_sinh: string | null
          ngay_sinh: string | null
          nv1: string | null
          sdt_hoc_sinh: string | null
          sdt_phu_huynh: string | null
          stt: number | null
          ten_phu_huynh: string | null
          tinh_trang_dang_ky: string[] | null
          trang_thai_ghi_danh: string | null
          truong_thpt: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hoc_sinh_lop_hien_tai_id_fkey"
            columns: ["lop_hien_tai_id"]
            isOneToOne: false
            referencedRelation: "lop"
            referencedColumns: ["id"]
          },
        ]
      }
      v_hop_dong_qua_han: {
        Row: {
          ho_ten: string | null
          hop_dong_id: string | null
          ma_hoc_sinh: string | null
          so_ngay_tre_nhat: number | null
          so_tien_cham: number | null
          ten_lop: string | null
        }
        Relationships: []
      }
      v_tai_chinh_hop_dong: {
        Row: {
          chuong_trinh_ma: string | null
          con_phai_thu: number | null
          doanh_thu_thuan: number | null
          ghi_danh_id: string | null
          hop_dong_id: string | null
          kich_hoat_luc: string | null
          lop_id: string | null
          thuc_thu: number | null
          trang_thai: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_lop_chuong_trinh"
            columns: ["chuong_trinh_ma"]
            isOneToOne: false
            referencedRelation: "chuong_trinh"
            referencedColumns: ["ma"]
          },
          {
            foreignKeyName: "ghi_danh_lop_id_fkey"
            columns: ["lop_id"]
            isOneToOne: false
            referencedRelation: "lop"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hop_dong_hoc_phi_ghi_danh_id_fkey"
            columns: ["ghi_danh_id"]
            isOneToOne: false
            referencedRelation: "ghi_danh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hop_dong_hoc_phi_ghi_danh_id_fkey"
            columns: ["ghi_danh_id"]
            isOneToOne: false
            referencedRelation: "v_hoc_sinh_danh_sach"
            referencedColumns: ["ghi_danh_id"]
          },
        ]
      }
      v_thuc_thu_hop_dong: {
        Row: {
          hop_dong_id: string | null
          thuc_thu: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_ht_tao_nhan_su: {
        Args: {
          p_chi_nhanh_id: string
          p_ho_ten: string
          p_user_id: string
          p_vai_tro: string
        }
        Returns: undefined
      }
      auth_role: { Args: never; Returns: string }
      bo_cau_con_khoi_de: {
        Args: { p_de_cau_hoi_id: string; p_de_id: string }
        Returns: undefined
      }
      can_manage_cap_hoc: { Args: { p_cap_hoc: number }; Returns: boolean }
      can_manage_mon_hoc:
        | { Args: { p_cap_hoc: number; p_mon_hoc: number }; Returns: boolean }
        | { Args: { p_mon_hoc: number }; Returns: boolean }
      cap_ma_cau_hoi: {
        Args: {
          p_bai_hoc: number
          p_cap_hoc: number
          p_chu_de: number
          p_chuong_trinh: number
          p_dang_cau: number
          p_hoc_phan: number
          p_mon_hoc: number
        }
        Returns: string
      }
      cap_nhat_trang_thai_ghi_danh: {
        Args: { p_ghi_danh_id: string; p_trang_thai_moi: string }
        Returns: {
          created_at: string
          deleted_at: string | null
          hoc_sinh_id: string
          id: string
          id_old: number
          import_batch_id: string | null
          lop_id: string
          ngay_bat_dau: string
          ngay_ket_thuc: string | null
          trang_thai: string
        }
        SetofOptions: {
          from: "*"
          to: "ghi_danh"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      chot_de: { Args: { p_de_id: string; p_so_ma?: number }; Returns: Json }
      chuyen_lop: {
        Args: { p_hoc_sinh_id: string; p_lop_moi_id: string }
        Returns: {
          anh_chan_dung: string | null
          cccd: string | null
          classin_uid: string | null
          created_at: string
          deleted_at: string | null
          dia_chi: string | null
          email: string | null
          gioi_tinh: string | null
          ho_ten: string
          id: string
          id_old: number
          import_batch_id: string | null
          khoi_thi: string | null
          lop_hien_tai_id: string | null
          lop_nhap_hoc_id: string
          ma_hoc_sinh: string
          nam_sinh: number | null
          ngay_sinh: string | null
          nguoi_tao: string | null
          nv1: string | null
          sdt_hoc_sinh: string | null
          sdt_phu_huynh: string | null
          stt: number | null
          ten_phu_huynh: string | null
          tinh_trang_dang_ky: string[] | null
          truong_dai_hoc: string | null
          truong_thpt: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "hoc_sinh"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      co_phan_cong: {
        Args: { p_lop_id: string; p_mon_hoc_ma: number }
        Returns: boolean
      }
      co_quyen_mon: {
        Args: { p_cap_hoc_ma: number; p_mon_hoc_ma: number }
        Returns: boolean
      }
      danh_dau_da_doi_mat_khau: { Args: never; Returns: undefined }
      danh_muc_cau_hoi_tro_giang: {
        Args: { p_mon_hoc: number }
        Returns: {
          bai_hoc: number
          chu_de: number
          dang_cau: number
          id: string
          ma_cau_hoi: string
          trang_thai: string
        }[]
      }
      danh_so_lai_de: { Args: { p_de_id: string }; Returns: undefined }
      de_da_chot_duoc_sua: { Args: { p_id: string }; Returns: boolean }
      de_duoc_sua: { Args: { p_id: string }; Returns: boolean }
      de_duoc_xem_noi_dung: { Args: { p_id: string }; Returns: boolean }
      do_phu_ma_tran: {
        Args: { p_ma_tran_id: string }
        Returns: {
          can: number
          co_dung: number
          co_noi: number
          dong_id: string
        }[]
      }
      doi_cum: {
        Args: {
          p_de_id: string
          p_don_vi_cu: string
          p_don_vi_moi: string
          p_dong_id: string
        }
        Returns: undefined
      }
      doi_thu_tu_cau_con: {
        Args: { p_cau_hoi_id: string; p_huong: string }
        Returns: undefined
      }
      goi_y_cum: {
        Args: { p_de_id: string; p_dong_id: string }
        Returns: {
          do_kho_tb: number
          don_vi_id: string
          la_cum: boolean
          lap_gan_day: boolean
          so_cau: number
          tieu_de: string
        }[]
      }
      hoc_sinh_cua_toi: {
        Args: { p_lop_id?: string }
        Returns: {
          ho_ten: string
          hoc_sinh_id: string
          lop_id: string
          ma_hoc_sinh: string
          ma_lop: string
          ten_lop: string
        }[]
      }
      khoa_don_vi: {
        Args: {
          p_de_id: string
          p_don_vi_id: string
          p_dong_id: string
          p_khoa: boolean
        }
        Returns: undefined
      }
      lop_trong_pham_vi: { Args: never; Returns: string[] }
      luu_ma_tran: {
        Args: {
          p_cap: number
          p_dong: Json
          p_id: string
          p_mo_ta: string
          p_mon: number
          p_ten: string
        }
        Returns: string
      }
      ma_tran_duoc_sua: { Args: { p_id: string }; Returns: boolean }
      master_admin_tao_nguoi_dung: {
        Args: {
          p_chi_nhanh_ids?: string[]
          p_ho_ten: string
          p_pham_vi?: Json
          p_phan_cong?: Json
          p_user_id: string
          p_vai_tro: string
        }
        Returns: undefined
      }
      nhan_ban_ma_tran: { Args: { p_id: string }; Returns: string }
      pool_dong: {
        Args: { p_dong_id: string; p_noi?: boolean }
        Returns: {
          cau_ids: string[]
          do_kho_tb: number
          don_vi_id: string
          la_cum: boolean
          tieu_de: string
        }[]
      }
      sinh_de: { Args: { p_de_id: string; p_seed?: string }; Returns: Json }
      tao_hoc_sinh: {
        Args: {
          p_anh_chan_dung?: string
          p_ho_ten: string
          p_lop_id: string
          p_sdt_phu_huynh?: string
        }
        Returns: {
          anh_chan_dung: string | null
          cccd: string | null
          classin_uid: string | null
          created_at: string
          deleted_at: string | null
          dia_chi: string | null
          email: string | null
          gioi_tinh: string | null
          ho_ten: string
          id: string
          id_old: number
          import_batch_id: string | null
          khoi_thi: string | null
          lop_hien_tai_id: string | null
          lop_nhap_hoc_id: string
          ma_hoc_sinh: string
          nam_sinh: number | null
          ngay_sinh: string | null
          nguoi_tao: string | null
          nv1: string | null
          sdt_hoc_sinh: string | null
          sdt_phu_huynh: string | null
          stt: number | null
          ten_phu_huynh: string | null
          tinh_trang_dang_ky: string[] | null
          truong_dai_hoc: string | null
          truong_thpt: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "hoc_sinh"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      tao_lop: {
        Args: {
          p_cap_hoc: number
          p_chi_nhanh_id?: string
          p_chuong_trinh: string
          p_nam_hoc: number
          p_ten_lop?: string
        }
        Returns: {
          cap_hoc_id: string
          cap_hoc_ma: number | null
          chi_nhanh_id: string | null
          chuong_trinh_id: string
          chuong_trinh_ma: string | null
          created_at: string
          deleted_at: string | null
          id: string
          id_old: number
          import_batch_id: string | null
          khoa_nhap_hoc: number | null
          ma_lop: string
          nam_hoc: number | null
          ngay_ket_thuc: string | null
          ngay_khai_giang: string | null
          nguoi_tao: string | null
          so_lop: number | null
          ten_lop: string | null
          tinh_trang: string[] | null
        }
        SetofOptions: {
          from: "*"
          to: "lop"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      tao_ma_de: { Args: { p_de_id: string; p_so_ma: number }; Returns: number }
      tao_ma_phieu_thu: { Args: never; Returns: string }
      thu_tu_ke_tiep_ngu_lieu: {
        Args: { p_ngu_lieu_id: string }
        Returns: number
      }
      tinh_do_day_de: {
        Args: { p_de_id: string }
        Returns: {
          can: number
          dat: number
          dong_id: string
        }[]
      }
      uuidv7: { Args: never; Returns: string }
      vi_tri_ngu_lieu: {
        Args: { p_id: string }
        Returns: {
          bai_hoc: number
          cap_hoc: number
          chu_de: number
          hoc_phan: number
          mon_hoc: number
        }[]
      }
      xem_mot_cau_hoi: {
        Args: { p_id: string }
        Returns: {
          dap_an_text: string
          id: string
          loi_giai: string
          lua_chon_noi_dung: string[]
          ma_cau_hoi: string
          noi_dung: string
        }[]
      }
      xoa_mem_ngu_lieu: { Args: { p_id: string }; Returns: undefined }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
