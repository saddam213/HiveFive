using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Transactions;
using System.Data.Entity;
using System.Data.Entity.Infrastructure;
using System.Linq.Expressions;

namespace HiveFive.Data.Common
{
	public static class DataContextExtensions
	{
		#region ToList NoLock

		public static List<T> ToListNoLock<T>(this IQueryable<T> query)
		{
			using (
				var scope = new TransactionScope(TransactionScopeOption.Required,
					new TransactionOptions() { IsolationLevel = IsolationLevel.ReadUncommitted },
					TransactionScopeAsyncFlowOption.Enabled))
			{
				var toReturn = query.ToList();
				scope.Complete();
				return toReturn;
			}
		}

		public static async Task<List<T>> ToListNoLockAsync<T>(this IQueryable<T> query)
		{
			using (
				var scope = new TransactionScope(TransactionScopeOption.Required,
					new TransactionOptions() { IsolationLevel = IsolationLevel.ReadUncommitted },
					TransactionScopeAsyncFlowOption.Enabled))
			{
				List<T> toReturn = await query.ToListAsync();
				scope.Complete();
				return toReturn;
			}
		}

		public static List<T> ToListNoLock<T>(this IOrderedQueryable<T> query)
		{
			using (
				var scope = new TransactionScope(TransactionScopeOption.Required,
					new TransactionOptions() { IsolationLevel = IsolationLevel.ReadUncommitted },
					TransactionScopeAsyncFlowOption.Enabled))
			{
				var toReturn = query.ToList();
				scope.Complete();
				return toReturn;
			}
		}

		public static async Task<List<T>> ToListNoLockAsync<T>(this IOrderedQueryable<T> query)
		{
			using (
				var scope = new TransactionScope(TransactionScopeOption.Required,
					new TransactionOptions() { IsolationLevel = IsolationLevel.ReadUncommitted },
					TransactionScopeAsyncFlowOption.Enabled))
			{
				List<T> toReturn = await query.ToListAsync();
				scope.Complete();
				return toReturn;
			}
		}

		public static List<T> ToListNoLock<T>(this DbRawSqlQuery<T> query)
		{
			using (
				var scope = new TransactionScope(TransactionScopeOption.Required,
					new TransactionOptions() { IsolationLevel = IsolationLevel.ReadUncommitted },
					TransactionScopeAsyncFlowOption.Enabled))
			{
				var toReturn = query.ToList();
				scope.Complete();
				return toReturn;
			}
		}

		public static async Task<List<T>> ToListNoLockAsync<T>(this DbRawSqlQuery<T> query)
		{
			using (
				var scope = new TransactionScope(TransactionScopeOption.Required,
					new TransactionOptions() { IsolationLevel = IsolationLevel.ReadUncommitted },
					TransactionScopeAsyncFlowOption.Enabled))
			{
				List<T> toReturn = await query.ToListAsync();
				scope.Complete();
				return toReturn;
			}
		}

		#endregion

		#region Count NoLock

		public static int CountNoLock<T>(this IQueryable<T> query)
		{
			using (
				var scope = new TransactionScope(TransactionScopeOption.Required,
					new TransactionOptions() { IsolationLevel = IsolationLevel.ReadUncommitted },
					TransactionScopeAsyncFlowOption.Enabled))
			{
				int toReturn = query.Count();
				scope.Complete();
				return toReturn;
			}
		}

		public static async Task<int> CountNoLockAsync<T>(this IQueryable<T> query)
		{
			using (
				var scope = new TransactionScope(TransactionScopeOption.Required,
					new TransactionOptions() { IsolationLevel = IsolationLevel.ReadUncommitted },
					TransactionScopeAsyncFlowOption.Enabled))
			{
				int toReturn = await query.CountAsync();
				scope.Complete();
				return toReturn;
			}
		}

		public static int CountNoLock<T>(this IOrderedQueryable<T> query)
		{
			using (
				var scope = new TransactionScope(TransactionScopeOption.Required,
					new TransactionOptions() { IsolationLevel = IsolationLevel.ReadUncommitted },
					TransactionScopeAsyncFlowOption.Enabled))
			{
				int toReturn = query.Count();
				scope.Complete();
				return toReturn;
			}
		}

		public static async Task<int> CountNoLockAsync<T>(this IOrderedQueryable<T> query)
		{
			using (
				var scope = new TransactionScope(TransactionScopeOption.Required,
					new TransactionOptions() { IsolationLevel = IsolationLevel.ReadUncommitted },
					TransactionScopeAsyncFlowOption.Enabled))
			{
				int toReturn = await query.CountAsync();
				scope.Complete();
				return toReturn;
			}
		}

		#endregion

		#region FirstOrDefault NoLock

		public static T FirstOrDefaultNoLock<T>(this IQueryable<T> query)
		{
			using (
				var scope = new TransactionScope(TransactionScopeOption.Required,
					new TransactionOptions() { IsolationLevel = IsolationLevel.ReadUncommitted },
					TransactionScopeAsyncFlowOption.Enabled))
			{
				var toReturn = query.FirstOrDefault();
				scope.Complete();
				return toReturn;
			}
		}

		public static async Task<T> FirstOrDefaultNoLockAsync<T>(this IQueryable<T> query)
		{
			using (
				var scope = new TransactionScope(TransactionScopeOption.Required,
					new TransactionOptions() { IsolationLevel = IsolationLevel.ReadUncommitted },
					TransactionScopeAsyncFlowOption.Enabled))
			{
				var toReturn = await query.FirstOrDefaultAsync();
				scope.Complete();
				return toReturn;
			}
		}

		public static T FirstOrDefaultNoLock<T>(this IOrderedQueryable<T> query)
		{
			using (
				var scope = new TransactionScope(TransactionScopeOption.Required,
					new TransactionOptions() { IsolationLevel = IsolationLevel.ReadUncommitted },
					TransactionScopeAsyncFlowOption.Enabled))
			{
				var toReturn = query.FirstOrDefault();
				scope.Complete();
				return toReturn;
			}
		}

		public static async Task<T> FirstOrDefaultNoLockAsync<T>(this IOrderedQueryable<T> query)
		{
			using (
				var scope = new TransactionScope(TransactionScopeOption.Required,
					new TransactionOptions() { IsolationLevel = IsolationLevel.ReadUncommitted },
					TransactionScopeAsyncFlowOption.Enabled))
			{
				var toReturn = await query.FirstOrDefaultAsync();
				scope.Complete();
				return toReturn;
			}
		}

		public static T FirstOrDefaultNoLock<T>(this IQueryable<T> query, Expression<Func<T, bool>> predicate)
		{
			using (
				var scope = new TransactionScope(TransactionScopeOption.Required,
					new TransactionOptions() { IsolationLevel = IsolationLevel.ReadUncommitted },
					TransactionScopeAsyncFlowOption.Enabled))
			{
				var toReturn = query.FirstOrDefault(predicate);
				scope.Complete();
				return toReturn;
			}
		}

		public static async Task<T> FirstOrDefaultNoLockAsync<T>(this IQueryable<T> query, Expression<Func<T, bool>> predicate)
		{
			using (
				var scope = new TransactionScope(TransactionScopeOption.Required,
					new TransactionOptions() { IsolationLevel = IsolationLevel.ReadUncommitted },
					TransactionScopeAsyncFlowOption.Enabled))
			{
				var toReturn = await query.FirstOrDefaultAsync(predicate);
				scope.Complete();
				return toReturn;
			}
		}

		public static T FirstOrDefaultNoLock<T>(this IOrderedQueryable<T> query, Expression<Func<T, bool>> predicate)
		{
			using (
				var scope = new TransactionScope(TransactionScopeOption.Required,
					new TransactionOptions() { IsolationLevel = IsolationLevel.ReadUncommitted },
					TransactionScopeAsyncFlowOption.Enabled))
			{
				var toReturn = query.FirstOrDefault(predicate);
				scope.Complete();
				return toReturn;
			}
		}

		public static async Task<T> FirstOrDefaultNoLockAsync<T>(this IOrderedQueryable<T> query, Expression<Func<T, bool>> predicate)
		{
			using (
				var scope = new TransactionScope(TransactionScopeOption.Required,
					new TransactionOptions() { IsolationLevel = IsolationLevel.ReadUncommitted },
					TransactionScopeAsyncFlowOption.Enabled))
			{
				var toReturn = await query.FirstOrDefaultAsync(predicate);
				scope.Complete();
				return toReturn;
			}
		}

		public static T FirstOrDefaultNoLock<T>(this DbRawSqlQuery<T> query)
		{
			using (
				var scope = new TransactionScope(TransactionScopeOption.Required,
					new TransactionOptions() { IsolationLevel = IsolationLevel.ReadUncommitted },
					TransactionScopeAsyncFlowOption.Enabled))
			{
				var toReturn = query.FirstOrDefault();
				scope.Complete();
				return toReturn;
			}
		}

		public static async Task<T> FirstOrDefaultNoLockAsync<T>(this DbRawSqlQuery<T> query)
		{
			using (
				var scope = new TransactionScope(TransactionScopeOption.Required,
					new TransactionOptions() { IsolationLevel = IsolationLevel.ReadUncommitted },
					TransactionScopeAsyncFlowOption.Enabled))
			{
				var toReturn = await query.FirstOrDefaultAsync();
				scope.Complete();
				return toReturn;
			}
		}

		#endregion

		#region Any NoLock

		public static bool AnyNoLock<T>(this IQueryable<T> query, Expression<Func<T, bool>> predicate)
		{
			using (
				var scope = new TransactionScope(TransactionScopeOption.Required,
					new TransactionOptions() { IsolationLevel = IsolationLevel.ReadUncommitted },
					TransactionScopeAsyncFlowOption.Enabled))
			{
				var toReturn = query.Any(predicate);
				scope.Complete();
				return toReturn;
			}
		}

		public static async Task<bool> AnyNoLockAsync<T>(this IQueryable<T> query, Expression<Func<T, bool>> predicate)
		{
			using (
				var scope = new TransactionScope(TransactionScopeOption.Required,
					new TransactionOptions() { IsolationLevel = IsolationLevel.ReadUncommitted },
					TransactionScopeAsyncFlowOption.Enabled))
			{
				var toReturn = await query.AnyAsync(predicate);
				scope.Complete();
				return toReturn;
			}
		}

		public static bool AnyNoLock<T>(this IOrderedQueryable<T> query, Expression<Func<T, bool>> predicate)
		{
			using (
				var scope = new TransactionScope(TransactionScopeOption.Required,
					new TransactionOptions() { IsolationLevel = IsolationLevel.ReadUncommitted },
					TransactionScopeAsyncFlowOption.Enabled))
			{
				var toReturn = query.Any(predicate);
				scope.Complete();
				return toReturn;
			}
		}

		public static async Task<bool> AnyNoLockAsync<T>(this IOrderedQueryable<T> query, Expression<Func<T, bool>> predicate)
		{
			using (
				var scope = new TransactionScope(TransactionScopeOption.Required,
					new TransactionOptions() { IsolationLevel = IsolationLevel.ReadUncommitted },
					TransactionScopeAsyncFlowOption.Enabled))
			{
				var toReturn = await query.AnyAsync(predicate);
				scope.Complete();
				return toReturn;
			}
		}

		public static bool AnyNoLock<T>(this IQueryable<T> query)
		{
			using (
				var scope = new TransactionScope(TransactionScopeOption.Required,
					new TransactionOptions() { IsolationLevel = IsolationLevel.ReadUncommitted },
					TransactionScopeAsyncFlowOption.Enabled))
			{
				var toReturn = query.Any();
				scope.Complete();
				return toReturn;
			}
		}

		public static async Task<bool> AnyNoLockAsync<T>(this IQueryable<T> query)
		{
			using (
				var scope = new TransactionScope(TransactionScopeOption.Required,
					new TransactionOptions() { IsolationLevel = IsolationLevel.ReadUncommitted },
					TransactionScopeAsyncFlowOption.Enabled))
			{
				var toReturn = await query.AnyAsync();
				scope.Complete();
				return toReturn;
			}
		}

		public static bool AnyNoLock<T>(this IOrderedQueryable<T> query)
		{
			using (
				var scope = new TransactionScope(TransactionScopeOption.Required,
					new TransactionOptions() { IsolationLevel = IsolationLevel.ReadUncommitted },
					TransactionScopeAsyncFlowOption.Enabled))
			{
				var toReturn = query.Any();
				scope.Complete();
				return toReturn;
			}
		}

		public static async Task<bool> AnyNoLockAsync<T>(this IOrderedQueryable<T> query)
		{
			using (
				var scope = new TransactionScope(TransactionScopeOption.Required,
					new TransactionOptions() { IsolationLevel = IsolationLevel.ReadUncommitted },
					TransactionScopeAsyncFlowOption.Enabled))
			{
				var toReturn = await query.AnyAsync();
				scope.Complete();
				return toReturn;
			}
		}

		#endregion
	}
}
