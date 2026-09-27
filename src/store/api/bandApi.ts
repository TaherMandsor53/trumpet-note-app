import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { logout } from '@/store/authSlice';
import {
  User,
  Tune,
  LavajamRecord,
  ExpenseRecord,
  AttendanceSession,
  AttendanceReportMetrics,
  DriveFolderSyncResult,
} from '@/types/band';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/api',
});

const baseQueryWithSessionCheck: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const urlStr = typeof args === 'string' ? args : args.url;
    const isAuthRoute = urlStr.includes('/auth/login') || urlStr.includes('/auth/forgot-password');
    if (!isAuthRoute && typeof window !== 'undefined') {
      try {
        localStorage.removeItem('tsg_session_expires_at');
        sessionStorage.clear();
      } catch (e) {
        // ignore
      }
      api.dispatch(logout());
      if (window.location.pathname !== '/') {
        window.location.href = '/?timeout=true';
      }
    }
  }

  return result;
};

export const bandApi = createApi({
  reducerPath: 'bandApi',
  baseQuery: baseQueryWithSessionCheck,
  tagTypes: ['Users', 'Financials', 'PersonalFinancials', 'Attendance', 'Reports', 'Tunes', 'Expenses', 'ReferenceLinks', 'AssignNotes'],
  endpoints: (builder) => ({
    // Auth
    getMe: builder.query<{ authenticated: boolean; user: User | null }, void>({
      query: () => '/auth/me',
    }),
    loginUser: builder.mutation<
      { success: boolean; user: User; token: string; message?: string },
      { username?: string; email?: string; password?: string; role?: string; userId?: string }
    >({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Users', 'Financials', 'PersonalFinancials', 'Attendance', 'Reports', 'Tunes'],
    }),
    logoutUser: builder.mutation<{ success: boolean }, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Users', 'Financials', 'PersonalFinancials', 'Attendance', 'Reports', 'Tunes'],
    }),
    verifyForgotUser: builder.mutation<
      { exists: boolean; user: { name: string; username: string; email: string; role: string; section: string }; message: string },
      { username: string }
    >({
      query: (body) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body: { action: 'verify', ...body },
      }),
    }),
    resetPassword: builder.mutation<
      { success: boolean; message: string; sheetSynced?: boolean },
      { username: string; newPassword: string }
    >({
      query: (body) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body: { action: 'reset', ...body },
      }),
      invalidatesTags: ['Users'],
    }),
    verifyCurrentPassword: builder.mutation<
      { success: boolean; verified: boolean; message: string },
      { currentPassword: string }
    >({
      query: (body) => ({
        url: '/auth/change-password',
        method: 'POST',
        body: { action: 'verify-current', ...body },
      }),
    }),
    changePassword: builder.mutation<
      { success: boolean; message: string; sheetSynced?: boolean },
      { currentPassword: string; newPassword: string; confirmPassword: string }
    >({
      query: (body) => ({
        url: '/auth/change-password',
        method: 'POST',
        body: { action: 'update', ...body },
      }),
      invalidatesTags: ['Users'],
    }),
    syncGoogleSheetMembers: builder.mutation<
      { success: boolean; count: number; source: string; message: string; sheetUrl: string; sheetName: string },
      void
    >({
      query: () => ({
        url: '/auth/sync-sheet',
        method: 'POST',
      }),
      invalidatesTags: ['Users'],
    }),

    // Users
    getUsers: builder.query<{ users: User[] }, { section?: string; role?: string; all?: string } | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.section) queryParams.append('section', params.section);
        if (params?.role) queryParams.append('role', params.role);
        if (params?.all) queryParams.append('all', params.all);
        return `/users?${queryParams.toString()}`;
      },
      providesTags: ['Users'],
    }),
    createUser: builder.mutation<{ success: boolean; user: User }, Partial<User>>({
      query: (body) => ({
        url: '/users',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Users'],
    }),
    updateUser: builder.mutation<{ success: boolean; user: User }, { id: string; updates: Partial<User> }>({
      query: ({ id, updates }) => ({
        url: `/users/${id}`,
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: ['Users'],
    }),
    deleteUser: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Users'],
    }),

    // Financials
    getFinancials: builder.query<{
      records: LavajamRecord[];
      years?: string[];
      selectedYear?: string;
      metrics: {
        totalCollected: number;
        totalPending: number;
        paidCount: number;
        unpaidCount?: number;
        pendingCount: number;
        collectionRate: number;
        totalRecords: number;
      };
    }, { year?: string | number } | void>({
      query: (params) => {
        const year = params?.year;
        return year ? `/financials?year=${encodeURIComponent(String(year))}` : '/financials';
      },
      providesTags: ['Financials'],
    }),
    getPersonalFinancials: builder.query<{
      userId: string;
      userName: string;
      section: string;
      currentStatus: 'Paid' | 'Pending';
      latestRecord: LavajamRecord | null;
      history: LavajamRecord[];
    }, void>({
      query: () => '/financials/personal',
      providesTags: ['PersonalFinancials'],
    }),
    createFinancialRecord: builder.mutation<{ success: boolean; record: LavajamRecord }, Partial<LavajamRecord>>({
      query: (body) => ({
        url: '/financials',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Financials', 'PersonalFinancials'],
    }),
    updateFinancialRecord: builder.mutation<{ success: boolean; record: LavajamRecord }, Partial<LavajamRecord>>({
      query: (body) => ({
        url: '/financials',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Financials', 'PersonalFinancials'],
    }),
    deleteFinancialRecord: builder.mutation<
      { success: boolean; message?: string },
      string | { id?: string; year?: string; name?: string; userName?: string }
    >({
      query: (arg) => {
        if (typeof arg === 'string') {
          const formatted = arg.startsWith('?') ? arg : (arg.includes('=') ? `?${arg}` : `?id=${arg}`);
          return { url: `/financials${formatted}`, method: 'DELETE' };
        }
        const params = new URLSearchParams();
        if (arg.id) params.append('id', arg.id);
        if (arg.year) params.append('year', arg.year);
        const nameVal = arg.name || arg.userName;
        if (nameVal) params.append('name', nameVal);
        return { url: `/financials?${params.toString()}`, method: 'DELETE' };
      },
      invalidatesTags: ['Financials', 'PersonalFinancials'],
    }),

    // Attendance
    getAttendanceSessions: builder.query<{ sessions: AttendanceSession[] }, void>({
      query: () => '/attendance',
      providesTags: ['Attendance'],
    }),
    getAttendanceMetrics: builder.query<AttendanceReportMetrics, void>({
      query: () => '/attendance/reports',
      providesTags: ['Reports'],
    }),
    markAttendance: builder.mutation<{ success: boolean; session: AttendanceSession }, Partial<AttendanceSession>>({
      query: (body) => ({
        url: '/attendance',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Attendance', 'Reports'],
    }),
    deleteAttendanceSession: builder.mutation<{ success: boolean; message?: string }, string>({
      query: (id) => ({
        url: `/attendance?id=${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Attendance', 'Reports'],
    }),

    // Tunes
    getTunes: builder.query<{ tunes: Tune[] }, { section?: string } | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.section) queryParams.append('section', params.section);
        return `/tunes?${queryParams.toString()}`;
      },
      providesTags: ['Tunes'],
    }),
    createTune: builder.mutation<{ success: boolean; tune: Tune }, Partial<Tune>>({
      query: (body) => ({
        url: '/tunes',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Tunes'],
    }),
    assignTune: builder.mutation<{ success: boolean; tune: Tune }, { tuneId: string; assignedUserIds: string[] }>({
      query: (body) => ({
        url: '/tunes/assign',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Tunes'],
    }),

    // Drive Sync
    syncDriveSection: builder.mutation<{ success: boolean; result: DriveFolderSyncResult }, { section: string }>({
      query: (body) => ({
        url: '/drive/sync',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Tunes'],
    }),

    // Expenses
    getExpenses: builder.query<{
      expenses: ExpenseRecord[];
      metrics: {
        totalExpenses: number;
        count: number;
      };
    }, void>({
      query: () => '/expenses',
      providesTags: ['Expenses'],
    }),
    createExpense: builder.mutation<{ success: boolean; expense: ExpenseRecord }, Partial<ExpenseRecord> & { additionalNotes?: string }>({
      query: (body) => ({
        url: '/expenses',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Expenses'],
    }),
    updateExpense: builder.mutation<{ success: boolean; expense: ExpenseRecord }, Partial<ExpenseRecord> & { originalDetails?: string; originalAmount?: number; additionalNotes?: string }>({
      query: (body) => ({
        url: '/expenses',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Expenses'],
    }),
    deleteExpense: builder.mutation<
      { success: boolean; message?: string },
      string | { id?: string; details?: string; expenseDetails?: string; amount?: number }
    >({
      query: (arg) => {
        if (typeof arg === 'string') {
          const formatted = arg.startsWith('?') ? arg : (arg.includes('=') ? `?${arg}` : `?id=${arg}`);
          return { url: `/expenses${formatted}`, method: 'DELETE' };
        }
        const params = new URLSearchParams();
        if (arg.id) params.append('id', arg.id);
        const detVal = arg.details || arg.expenseDetails;
        if (detVal) params.append('details', detVal);
        if (arg.amount !== undefined) params.append('amount', String(arg.amount));
        return { url: `/expenses?${params.toString()}`, method: 'DELETE' };
      },
      invalidatesTags: ['Expenses'],
    }),

    // Reference Links (Google Sheet Reference Link & My Drive Folders)
    getReferenceLinks: builder.query<{ referenceLinks: any[] }, void>({
      query: () => '/reference-links',
      providesTags: ['ReferenceLinks'],
    }),
    addReferenceLink: builder.mutation<{ success: boolean; message: string; record: any }, FormData>({
      query: (formData) => ({
        url: '/reference-links',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['ReferenceLinks', 'Tunes'],
    }),
    updateReferenceLink: builder.mutation<{ success: boolean; message: string; updates: any }, FormData | { originalTuneName: string; tuneName?: string; instrumentType?: string; youtubeLink?: string; instagramLink?: string }>({
      query: (body) => ({
        url: '/reference-links',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['ReferenceLinks', 'Tunes'],
    }),
    deleteReferenceLink: builder.mutation<{ success: boolean; message: string }, string>({
      query: (tuneName) => ({
        url: `/reference-links?tuneName=${encodeURIComponent(tuneName)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ReferenceLinks', 'Tunes'],
    }),

    // Assign Notes (Assign Notes Sheet in Excel)
    getAssignedNotes: builder.query<{ assignedNotes: any[]; userAssignedTunes: string[] }, void>({
      query: () => '/assign-notes',
      providesTags: ['AssignNotes'],
    }),
    assignNotes: builder.mutation<
      { success: boolean; message: string; assignedTunes?: string },
      { tuneName: string; memberName?: string; memberNames?: string[]; assignments?: any[]; action?: 'assign' | 'unassign'; section?: string; itsNumber?: string }
    >({
      query: (body) => ({
        url: '/assign-notes',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AssignNotes', 'Tunes', 'ReferenceLinks'],
    }),
  }),
});

export const {
  useGetMeQuery,
  useLoginUserMutation,
  useLogoutUserMutation,
  useVerifyForgotUserMutation,
  useResetPasswordMutation,
  useVerifyCurrentPasswordMutation,
  useChangePasswordMutation,
  useSyncGoogleSheetMembersMutation,
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetFinancialsQuery,
  useGetPersonalFinancialsQuery,
  useCreateFinancialRecordMutation,
  useUpdateFinancialRecordMutation,
  useDeleteFinancialRecordMutation,
  useGetExpensesQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  useGetAttendanceSessionsQuery,
  useGetAttendanceMetricsQuery,
  useMarkAttendanceMutation,
  useDeleteAttendanceSessionMutation,
  useGetTunesQuery,
  useCreateTuneMutation,
  useAssignTuneMutation,
  useSyncDriveSectionMutation,
  useGetReferenceLinksQuery,
  useAddReferenceLinkMutation,
  useUpdateReferenceLinkMutation,
  useDeleteReferenceLinkMutation,
  useGetAssignedNotesQuery,
  useAssignNotesMutation,
} = bandApi;

