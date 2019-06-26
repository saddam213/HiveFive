using System;
using System.Collections;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;

namespace HiveFive.Framework.Objects
{
	public class ConcurrentList<T> : ConcurrentDictionary<T, byte>, IEnumerable<T> where T : IComparable
	{
		private static readonly byte Default = 0;

		public ConcurrentList()
		{
		}

		public ConcurrentList(T initial) : base(new[] {new KeyValuePair<T, byte>(initial, Default)})
		{
		}

		public ConcurrentList(IEnumerable<T> collection) : base(collection.ToDictionary(k => k, v => Default))
		{
		}

		public new IEnumerator<T> GetEnumerator()
		{
			return Keys.GetEnumerator();
		}

		IEnumerator IEnumerable.GetEnumerator()
		{
			return Keys.GetEnumerator();
		}

		public bool Add(T item)
		{
			return TryAdd(item, Default);
		}

		public List<T> CloneKeys()
		{
			var keys = new T[Count];
			Keys.CopyTo(keys, 0);
			return keys.ToList();
		}

		public bool Remove(T item)
		{
			return TryRemove(item, out _);
		}
	}
}