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
          ngu_lieu_id: string | null
          nguoi_tao: string | null
          noi_dung: string
          stt_cau: number | null
          tags: string[] | null
          ti_le_dung: number | null
          updated_at: string
        }
        Insert: {
          bai_hoc?: number | null
          cap_hoc?: number | null
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
          ngu_lieu_id?: string | null
          nguoi_tao?: string | null
          noi_dung: string
          stt_cau?: number | null
          tags?: string[] | null
          ti_le_dung?: number | null
          updated_at?: string
        }
        Update: {
          bai_hoc?: number | null
          cap_hoc?: number | null
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
          ngu_lieu_id?: string | null
          nguoi_tao?: string | null
          noi_dung?: string
          stt_cau?: number | null
          tags?: string[] | null
          ti_le_dung?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cau_hoi_ngu_lieu_id_fkey"
            columns: ["ngu_lieu_id"]
            isOneToOne: false
            referencedRelation: "ngu_lieu"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cau_hoi_nguoi_tao_fkey"
            columns: ["nguoi_tao"]
            isOneToOne: false
            referencedRelation: "users"
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
      de: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          ma_de: string | null
          mo_ta: string | null
          nguoi_tao: string | null
          ten: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          ma_de?: string | null
          mo_ta?: string | null
          nguoi_tao?: string | null
          ten: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          ma_de?: string | null
          mo_ta?: string | null
          nguoi_tao?: string | null
          ten?: string
          updated_at?: string
        }
        Relationships: [
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
          de_id: string
          diem: number | null
          id: string
          thu_tu: number
        }
        Insert: {
          cau_hoi_id: string
          created_at?: string
          de_id: string
          diem?: number | null
          id?: string
          thu_tu: number
        }
        Update: {
          cau_hoi_id?: string
          created_at?: string
          de_id?: string
          diem?: number | null
          id?: string
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
            foreignKeyName: "de_cau_hoi_de_id_fkey"
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
          id: string
          ma: number
          mo_ta: string | null
          mon_hoc_id: string
          mon_hoc_ma: number
          nguoi_tao: string | null
          ten: string
          updated_at: string
        }
        Insert: {
          cap_hoc_ma: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          ma: number
          mo_ta?: string | null
          mon_hoc_id: string
          mon_hoc_ma: number
          nguoi_tao?: string | null
          ten: string
          updated_at?: string
        }
        Update: {
          cap_hoc_ma?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          ma?: number
          mo_ta?: string | null
          mon_hoc_id?: string
          mon_hoc_ma?: number
          nguoi_tao?: string | null
          ten?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hoc_phan_cap_hoc_ma_mon_hoc_ma_fkey"
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
          khoi_thi: string | null
          lop_hien_tai_id: string | null
          lop_nhap_hoc_id: string
          ma_hoc_sinh: string
          ngay_sinh: string | null
          nguoi_tao: string | null
          nv1: string | null
          sdt_hoc_sinh: string | null
          sdt_phu_huynh: string | null
          stt: number | null
          ten_phu_huynh: string | null
          tinh_trang_dang_ky: string[] | null
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
          khoi_thi?: string | null
          lop_hien_tai_id?: string | null
          lop_nhap_hoc_id: string
          ma_hoc_sinh: string
          ngay_sinh?: string | null
          nguoi_tao?: string | null
          nv1?: string | null
          sdt_hoc_sinh?: string | null
          sdt_phu_huynh?: string | null
          stt?: number | null
          ten_phu_huynh?: string | null
          tinh_trang_dang_ky?: string[] | null
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
          khoi_thi?: string | null
          lop_hien_tai_id?: string | null
          lop_nhap_hoc_id?: string
          ma_hoc_sinh?: string
          ngay_sinh?: string | null
          nguoi_tao?: string | null
          nv1?: string | null
          sdt_hoc_sinh?: string | null
          sdt_phu_huynh?: string | null
          stt?: number | null
          ten_phu_huynh?: string | null
          tinh_trang_dang_ky?: string[] | null
          truong_thpt?: string | null
          updated_at?: string
        }
        Relationships: [
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
          ghi_danh_id: string
          gia_niem_yet: number
          gia_tri_giam_gia: number
          goi_hoc_phi_id: string
          hinh_thuc_dong: string
          id: string
          id_old: number
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
          ghi_danh_id: string
          gia_niem_yet: number
          gia_tri_giam_gia?: number
          goi_hoc_phi_id: string
          hinh_thuc_dong: string
          id?: string
          id_old?: never
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
          ghi_danh_id?: string
          gia_niem_yet?: number
          gia_tri_giam_gia?: number
          goi_hoc_phi_id?: string
          hinh_thuc_dong?: string
          id?: string
          id_old?: never
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
            isOneToOne: true
            referencedRelation: "ghi_danh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hop_dong_hoc_phi_goi_hoc_phi_id_fkey"
            columns: ["goi_hoc_phi_id"]
            isOneToOne: false
            referencedRelation: "goi_hoc_phi"
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
      ky_dong_hoc_phi: {
        Row: {
          created_at: string
          hop_dong_id: string
          id: string
          id_old: number
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
      ngu_lieu: {
        Row: {
          bai_hoc_id: string | null
          cap_hoc_ma: number | null
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
          tieu_de: string | null
          updated_at: string
        }
        Insert: {
          bai_hoc_id?: string | null
          cap_hoc_ma?: number | null
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
          tieu_de?: string | null
          updated_at?: string
        }
        Update: {
          bai_hoc_id?: string | null
          cap_hoc_ma?: number | null
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
      phieu_thu: {
        Row: {
          created_at: string
          ghi_chu: string | null
          hinh_thuc: string
          hop_dong_id: string
          id: string
          id_old: number
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
            foreignKeyName: "user_pham_vi_cap_hoc_ma_mon_hoc_ma_fkey"
            columns: ["cap_hoc_ma", "mon_hoc_ma"]
            isOneToOne: false
            referencedRelation: "mon_hoc"
            referencedColumns: ["cap_hoc_ma", "ma"]
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
          trang_thai: string
          vai_tro: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email: string
          ho_ten?: string | null
          id: string
          trang_thai?: string
          vai_tro?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string
          ho_ten?: string | null
          id?: string
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
            isOneToOne: true
            referencedRelation: "ghi_danh"
            referencedColumns: ["id"]
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
      auth_role: { Args: never; Returns: string }
      can_manage_cap_hoc: { Args: { p_cap_hoc: number }; Returns: boolean }
      can_manage_mon_hoc: {
        Args: { p_cap_hoc: number; p_mon_hoc: number }
        Returns: boolean
      }
      cap_nhat_trang_thai_ghi_danh: {
        Args: { p_ghi_danh_id: string; p_trang_thai_moi: string }
        Returns: {
          created_at: string
          deleted_at: string | null
          hoc_sinh_id: string
          id: string
          id_old: number
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
          khoi_thi: string | null
          lop_hien_tai_id: string | null
          lop_nhap_hoc_id: string
          ma_hoc_sinh: string
          ngay_sinh: string | null
          nguoi_tao: string | null
          nv1: string | null
          sdt_hoc_sinh: string | null
          sdt_phu_huynh: string | null
          stt: number | null
          ten_phu_huynh: string | null
          tinh_trang_dang_ky: string[] | null
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
      danh_sach_gv: {
        Args: never
        Returns: {
          ho_ten: string
          id: string
        }[]
      }
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
          khoi_thi: string | null
          lop_hien_tai_id: string | null
          lop_nhap_hoc_id: string
          ma_hoc_sinh: string
          ngay_sinh: string | null
          nguoi_tao: string | null
          nv1: string | null
          sdt_hoc_sinh: string | null
          sdt_phu_huynh: string | null
          stt: number | null
          ten_phu_huynh: string | null
          tinh_trang_dang_ky: string[] | null
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
      tao_ma_phieu_thu: { Args: never; Returns: string }
      uuidv7: { Args: never; Returns: string }
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
