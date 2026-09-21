import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import {
  User,
  Tune,
  LavajamRecord,
  AttendanceSession,
  AttendanceReportMetrics,
  DriveFolderSyncResult,
} from '@/types/band';

export const bandApi = createApi({
  reducerPath: 'bandApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
  }),
  tagTypes: ['Users', 'Financials', 'PersonalFinancials', 'Attendance', 'Reports', 'Tunes'],
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
      metrics: {
        totalCollected: number;
        totalPending: number;
        paidCount: number;
        pendingCount: number;
        collectionRate: number;
        totalRecords: number;
      };
    }, void>({
      query: () => '/financials',
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
    deleteFinancialRecord: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/financials?id=${id}`,
        method: 'DELETE',
      }),
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
  }),
});

export const {
  useGetMeQuery,
  useLoginUserMutation,
  useLogoutUserMutation,
  useVerifyForgotUserMutation,
  useResetPasswordMutation,
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
  useGetAttendanceSessionsQuery,
  useGetAttendanceMetricsQuery,
  useMarkAttendanceMutation,
  useGetTunesQuery,
  useCreateTuneMutation,
  useAssignTuneMutation,
  useSyncDriveSectionMutation,
} = bandApi;
