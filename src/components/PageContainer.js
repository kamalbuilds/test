import * as React from 'react';

import MaxWidth from '@codesandbox/common/lib/components/flex/MaxWidth';
import Padding from '@codesandbox/common/lib/components/spacing/Padding';

export default ({ children, ...props }: { children: React.Node }) => (
  <MaxWidth width={1440} {...props}>
    <Padding top={8} bottom={1}>
      {children}
    </Padding>
  </MaxWidth>
);
